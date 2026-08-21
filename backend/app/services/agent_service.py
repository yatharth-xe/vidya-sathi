"""
Agent orchestration service.

This module sits between the API routes and the agent adapters.
It is responsible for:

1. Loading all context from the database (via controlled CRUD functions).
2. Building typed request objects for the adapters.
3. Calling the adapter (Student or Teacher).
4. Persisting any state changes the agent requests (level update, notification, etc.)
   through the controlled CRUD layer — NOT through the adapter.

CRITICAL: This service is the only place that touches the DB on behalf of agents.
          Adapters receive read-only context in their request objects.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.database import crud, models
from app.schemas import agent as agent_schemas
from app.services.student_agent_adapter import get_student_agent
from app.services.teacher_agent_adapter import get_teacher_agent


# ===========================================================================
# Student Agent orchestration
# ===========================================================================

def run_student_chat(
    db: Session,
    *,
    student_id: int,
    classroom_id: int,
    assignment_id: int,
    question_id: Optional[int],
    message: str,
) -> agent_schemas.StudentAgentResponse:
    """
    Orchestrate a student agent interaction.

    Steps
    -----
    1. Load question context from DB (if question_id given).
    2. Load or create a progress row for this student+question.
    3. Build a typed StudentAgentRequest.
    4. Call the adapter (ML Member 2's implementation).
    5. Persist any state changes the agent requested:
       - level update
       - teacher notification
    6. Return the typed response.
    """

    # --- 1. Load question context -------------------------------------------
    question_ctx: Optional[agent_schemas.QuestionContext] = None
    if question_id:
        question = db.query(models.AssignmentQuestion).filter(
            models.AssignmentQuestion.id == question_id
        ).first()
        if question:
            question_ctx = agent_schemas.QuestionContext(
                question_id=question.id,
                question_number=question.question_number,
                question_text=question.question_text,
                subject=question.subject,
                topic=question.topic,
            )

    # --- 2. Load or create progress row ------------------------------------
    progress_ctx: Optional[agent_schemas.ProgressContext] = None
    if question_id:
        progress = crud.get_or_create_question_progress(
            db,
            student_id=student_id,
            question_id=question_id,
            assignment_id=assignment_id,
            classroom_id=classroom_id,
            subject=question_ctx.subject if question_ctx else None,
            topic=question_ctx.topic if question_ctx else None,
        )
        progress_ctx = agent_schemas.ProgressContext(
            progress_id=progress.id,
            level=progress.level,
            attention_priority=progress.attention_priority,
            teacher_intimated=progress.teacher_intimated,
            initial_attempt=progress.initial_attempt,
            quiz_score=progress.quiz_score,
            subject=progress.subject,
            topic=progress.topic,
        )

    # --- 3. Load student name for context -----------------------------------
    student = crud.get_user(db, student_id)
    student_name = student.name if student else None

    # --- 4. Build request and call adapter ----------------------------------
    agent_request = agent_schemas.StudentAgentRequest(
        student_id=student_id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
        question_id=question_id,
        message=message,
        question_context=question_ctx,
        current_progress=progress_ctx,
        student_name=student_name,
    )

    adapter = get_student_agent()
    agent_response = adapter.chat(agent_request)

    # --- 5. Persist state changes the agent requested ----------------------
    if progress_ctx and agent_response.level != progress_ctx.level:
        # Level must be 1-4 (schema validation already enforces this, but guard here too)
        new_level = max(1, min(4, agent_response.level))
        crud.update_question_level(
            db,
            progress_id=progress_ctx.progress_id,
            level=new_level,
            attention_priority=agent_response.attention_priority,
            teacher_intimated=agent_response.teacher_intimated,
        )

    if agent_response.teacher_intimated and progress_ctx:
        # Find the classroom's teacher to send notification to
        classroom = crud.get_classroom(db, classroom_id)
        if classroom:
            message_text = (
                f"Student '{student_name}' needs attention on "
                f"topic '{agent_response.topic or 'unknown'}' "
                f"(level {agent_response.level})."
            )
            crud.create_teacher_notification(
                db,
                teacher_id=classroom.teacher_id,
                student_id=student_id,
                classroom_id=classroom_id,
                assignment_id=assignment_id,
                question_id=question_id,
                topic=agent_response.topic,
                level=agent_response.level,
                priority=agent_response.attention_priority,
                message=message_text,
            )

    return agent_response


# ===========================================================================
# Teacher Agent orchestration
# ===========================================================================

def run_teacher_insights(
    db: Session,
    *,
    teacher_id: int,
    classroom_id: int,
    assignment_id: Optional[int] = None,
) -> agent_schemas.TeacherAgentResponse:
    """
    Orchestrate a teacher agent insight request.

    Steps
    -----
    1. Load all structured analytics from DB via controlled CRUD.
    2. Build a typed TeacherAgentRequest with pre-computed metrics.
    3. Call the adapter (ML Member 3's implementation).
    4. Return the typed response.

    The adapter receives all needed data and must NOT query the DB.
    """

    # --- 1. Load raw progress data -----------------------------------------
    progress_records = crud.get_classroom_progress_summary(db, classroom_id)

    # Filter to assignment if specified
    if assignment_id:
        progress_records = [r for r in progress_records if r.assignment_id == assignment_id]

    # --- 2. Compute analytics from progress records ------------------------
    level_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    topic_level_map: dict = {}      # topic → list of levels seen
    subject_level_map: dict = {}    # subject → list of levels seen
    question_level_map: dict = {}   # question_id → list of levels

    level_3_student_ids: list = []
    level_4_student_ids: list = []

    for r in progress_records:
        lvl = r.level if r.level in (1, 2, 3, 4) else 1
        level_counts[lvl] += 1

        if r.topic:
            topic_level_map.setdefault(r.topic, []).append(lvl)
        if r.subject:
            subject_level_map.setdefault(r.subject, []).append(lvl)
        if r.question_id:
            question_level_map.setdefault(r.question_id, []).append(lvl)

        if lvl == 3 and r.student_id not in level_3_student_ids:
            level_3_student_ids.append(r.student_id)
        if lvl == 4 and r.student_id not in level_4_student_ids:
            level_4_student_ids.append(r.student_id)

    total = len(progress_records)
    indep_pct = (level_counts[1] / total * 100.0) if total > 0 else 100.0

    # Weak topics: average level > 1.5
    weak_topics = [
        topic for topic, levels in topic_level_map.items()
        if (sum(levels) / len(levels)) > 1.5
    ]

    # Weak subjects: average level > 1.5
    weak_subjects = [
        subj for subj, levels in subject_level_map.items()
        if (sum(levels) / len(levels)) > 1.5
    ]

    # Difficult questions: >50% of students at level 3 or 4
    difficult_question_ids = [
        qid for qid, levels in question_level_map.items()
        if len(levels) > 0 and (sum(1 for l in levels if l >= 3) / len(levels)) > 0.5
    ]

    # Serialize progress summary rows for the adapter (typed dicts, not ORM objects)
    progress_summary = [
        {
            "student_id": r.student_id,
            "question_id": r.question_id,
            "assignment_id": r.assignment_id,
            "level": r.level,
            "topic": r.topic,
            "subject": r.subject,
            "attention_priority": r.attention_priority,
            "quiz_score": r.quiz_score,
            "teacher_intimated": r.teacher_intimated,
        }
        for r in progress_records
    ]

    # --- 3. Load pending notifications ------------------------------------
    raw_notifications = crud.get_unread_notifications(db, teacher_id)
    # Filter to this classroom
    classroom_notifications = [n for n in raw_notifications if n.classroom_id == classroom_id]

    notification_summaries = []
    for n in classroom_notifications:
        student = crud.get_user(db, n.student_id)
        notification_summaries.append(
            agent_schemas.NotificationSummary(
                notification_id=n.id,
                student_id=n.student_id,
                student_name=student.name if student else None,
                topic=n.topic,
                level=n.level,
                priority=n.priority,
                message=n.message,
                created_at=n.created_at,
            )
        )

    # --- 4. Build request and call adapter --------------------------------
    agent_request = agent_schemas.TeacherAgentRequest(
        teacher_id=teacher_id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
        student_progress_summary=progress_summary,
        weak_topics=weak_topics,
        weak_subjects=weak_subjects,
        level_3_student_ids=level_3_student_ids,
        level_4_student_ids=level_4_student_ids,
        difficult_question_ids=difficult_question_ids,
        independent_completion_percentage=round(indep_pct, 1),
    )

    adapter = get_teacher_agent()
    agent_response = adapter.analyze(agent_request)

    # Inject the notifications (backend always controls this — not the adapter)
    agent_response.pending_notifications = notification_summaries

    return agent_response
