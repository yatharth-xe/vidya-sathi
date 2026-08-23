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

import logging

from app.database import crud, models
from app.schemas import agent as agent_schemas
from app.services.student_agent_adapter import get_student_agent
from app.services.teacher_agent_adapter import get_teacher_agent

logger = logging.getLogger("uvicorn.error")


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

    # --- 5b. Reliability safeguard (Phase 10) -----------------------------
    # Guarantee every applicable doubt exchange produces exactly ONE
    # conversational learning-state persistence. If the agent did not invoke
    # the tool, the backend performs one controlled upsert through the SAME
    # service, preserving the current level (never fabricating Level 1) and
    # letting the quiz-authority guard reject if applicable.
    metadata = agent_response.metadata or {}
    tool_called = bool(metadata.get("learning_state_tool_called"))
    _conversational_assessment_source = "agent_tool" if tool_called else None
    if (not tool_called) and question_id and progress_ctx:
        try:
            from app.services.learning_state_service import (
                upsert_student_learning_state)

            fallback_result = upsert_student_learning_state(
                db,
                student_id=student_id,
                classroom_id=classroom_id,
                assignment_id=assignment_id,
                question_id=question_id,
                level=progress_ctx.level,   # preserve — no fabricated L1
                topic=progress_ctx.topic,
                trusted_subject=progress_ctx.subject,
            )
            _conversational_assessment_source = "backend_fallback"
            logging.getLogger("uvicorn.error").info(
                "learning_state_assessment_source=backend_fallback "
                "result=%s", fallback_result.get("status"))
        except Exception:  # never break the chat on a fallback issue
            logger.exception("learning-state fallback failed; continuing")

    # Record internal observability (dropped by the HTTP contract mapping).
    agent_meta = dict(agent_response.metadata or {})
    agent_meta["learning_state_assessment_source"] = \
        _conversational_assessment_source or "agent_tool"
    agent_response.metadata = agent_meta

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
    Orchestrate a teacher agent insight request using deterministic analytics_service.
    """
    from app.services import analytics_service

    # --- 1. Fetch deterministic analytics from DB -------------------------
    indep_pct = analytics_service.calculate_independent_completion(
        db, classroom_id=classroom_id, assignment_id=assignment_id
    )
    if indep_pct is None:
        indep_pct = 100.0

    weak_topics_raw = analytics_service.get_weak_topics(
        db, classroom_id=classroom_id, teacher_id=teacher_id
    )
    weak_subjects_raw = analytics_service.get_weak_subjects(
        db, classroom_id=classroom_id, teacher_id=teacher_id
    )
    difficult_questions_raw = analytics_service.get_difficult_questions(
        db, classroom_id=classroom_id, assignment_id=assignment_id
    )
    level_3_students = analytics_service.get_level3_students(
        db, classroom_id=classroom_id, teacher_id=teacher_id
    )
    level_4_students = analytics_service.get_level4_students(
        db, classroom_id=classroom_id, teacher_id=teacher_id
    )

    # --- 2. Load pending notifications for this teacher & classroom -------
    raw_notifications = crud.get_unread_notifications(db, teacher_id)
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

    # --- 3. Build typed response schemas -----------------------------------
    weak_topic_models = [
        agent_schemas.WeakTopic(
            topic=t["topic"],
            subject=t["subject"],
            affected_students=t["affected_students"],
        )
        for t in weak_topics_raw
    ]

    weak_subjects_list = [s["subject"] for s in weak_subjects_raw]

    difficult_q_models = [
        agent_schemas.DifficultQuestion(
            question_id=q["question_id"],
            question_text=f"Question {q['question_number']}: {q['question_text']}",
            difficulty_percentage=q["struggle_percentage"],
            students_struggling=q["struggle_count"],
        )
        for q in difficult_questions_raw
    ]

    # Combine Level 3 and Level 4 high attention students
    high_att_map = {}
    for s in level_4_students:
        sid = s["student_id"]
        high_att_map[sid] = agent_schemas.HighAttentionStudent(
            student_id=sid,
            name=s["student_name"],
            level=4,
            topics=[s["topic"]] if s.get("topic") else [],
            attention_priority="high",
        )
    for s in level_3_students:
        sid = s["student_id"]
        if sid not in high_att_map:
            high_att_map[sid] = agent_schemas.HighAttentionStudent(
                student_id=sid,
                name=s["student_name"],
                level=3,
                topics=[s["topic"]] if s.get("topic") else [],
                attention_priority="normal",
            )
    high_att_list = list(high_att_map.values())

    # --- 4. Call Agent Adapter with fallback error handling ----------------
    agent_request = agent_schemas.TeacherAgentRequest(
        teacher_id=teacher_id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
        student_progress_summary=[],
        weak_topics=[t["topic"] for t in weak_topics_raw],
        weak_subjects=weak_subjects_list,
        level_3_student_ids=[s["student_id"] for s in level_3_students],
        level_4_student_ids=[s["student_id"] for s in level_4_students],
        difficult_question_ids=[q["question_id"] for q in difficult_questions_raw],
        independent_completion_percentage=indep_pct,
    )

    try:
        from app.services.teacher_agent_tools import set_teacher_scope

        set_teacher_scope({"teacher_id": teacher_id})
        adapter = get_teacher_agent()
        agent_response = adapter.analyze(agent_request)

        # Enforce backend-derived values for deterministic accuracy
        agent_response.classroom_id = classroom_id
        agent_response.independent_completion_percentage = indep_pct
        agent_response.level_3_count = len(level_3_students)
        agent_response.level_4_count = len(level_4_students)
        agent_response.weak_topics = weak_topic_models
        agent_response.weak_subjects = weak_subjects_list
        agent_response.difficult_questions = difficult_q_models
        agent_response.high_attention_students = high_att_list
        agent_response.pending_notifications = notification_summaries

        set_teacher_scope(None)  # clear trusted scope after the run
        return agent_response
    except Exception:
        # Fallback handling: return deterministic analytics with fallback notice
        try:
            from app.services.teacher_agent_tools import set_teacher_scope

            set_teacher_scope(None)
        except ImportError:
            pass
        return agent_schemas.TeacherAgentResponse(
            classroom_id=classroom_id,
            independent_completion_percentage=indep_pct,
            level_3_count=len(level_3_students),
            level_4_count=len(level_4_students),
            weak_topics=weak_topic_models,
            weak_subjects=weak_subjects_list,
            difficult_questions=difficult_q_models,
            high_attention_students=high_att_list,
            pending_notifications=notification_summaries,
            insights_text="AI narrative temporarily unavailable. Review deterministic analytics below.",
        )

