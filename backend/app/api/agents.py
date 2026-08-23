"""
Agent API routes.

Security model
--------------
Student endpoint (/student/chat):
  - student_id from JWT only (get_current_student)
  - classroom_id derived from assignment lookup (never from body)
  - classroom membership verified
  - assignment ∈ classroom verified
  - question ∈ assignment verified (if supplied)

Teacher endpoint (/teacher/insights/{classroom_id}):
  - teacher_id from JWT only (get_current_teacher)
  - classroom ownership verified
  - assignment ∈ classroom verified (if assignment_id supplied)

Adapters:
  - Routes call agent_service functions only
  - agent_service calls adapters
  - Adapters never receive a db Session
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_student, get_current_teacher
from app.database import models, crud
from app.schemas import agent as agent_schemas
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])


# ---------------------------------------------------------------------------
# Shared validation helpers
# ---------------------------------------------------------------------------

def _resolve_and_validate_student_context(
    db: Session,
    student_id: int,
    assignment_id: int,
    question_id: Optional[int],
) -> models.Assignment:
    """
    Verify the full chain: student enrolled → assignment in classroom → question in assignment.
    Returns the assignment ORM object (classroom_id is on it).
    """
    # 1. Assignment must exist
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # 2. Student must be enrolled in the classroom that owns the assignment
    if not crud.is_student_enrolled(db, student_id, assignment.classroom_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are not enrolled in the classroom that owns this assignment",
        )

    # 3. Question must belong to this assignment (if supplied)
    if question_id is not None:
        question = db.query(models.AssignmentQuestion).filter(
            models.AssignmentQuestion.id == question_id,
            models.AssignmentQuestion.assignment_id == assignment_id,
        ).first()
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question {question_id} does not belong to assignment {assignment_id}",
            )

    return assignment


def _resolve_and_validate_teacher_context(
    db: Session,
    teacher_id: int,
    classroom_id: int,
    assignment_id: Optional[int],
) -> None:
    """
    Verify: teacher owns the classroom → assignment belongs to classroom (if given).
    """
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    if classroom.teacher_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this classroom",
        )
    if assignment_id is not None:
        assignment = crud.get_assignment(db, assignment_id)
        if not assignment or assignment.classroom_id != classroom_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment {assignment_id} does not belong to classroom {classroom_id}",
            )


# ---------------------------------------------------------------------------
# POST /api/v1/agents/student/chat
# ---------------------------------------------------------------------------

@router.post(
    "/student/chat",
    response_model=agent_schemas.StudentChatResponse,
    summary="Submit a student doubt/message to the Student Agent",
)
def student_agent_chat(
    request: agent_schemas.StudentChatRequest,
    current_student: models.User = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Student sends a doubt or message about a specific assignment/question.

    Backend guarantees
    ------------------
    - student_id is taken from the JWT — the client cannot impersonate another student.
    - classroom_id is derived from the assignment record, not from the request body.
    - Classroom membership, assignment ownership, and question ownership are all
      verified before the message is forwarded to the agent.

    The agent response may update the student's learning level and trigger
    a teacher notification — both are persisted by the backend service, not
    by the agent itself.
    """
    # Validate the full chain
    assignment = _resolve_and_validate_student_context(
        db,
        student_id=current_student.id,
        assignment_id=request.assignment_id,
        question_id=request.question_id,
    )

    # Orchestrate: load context → call adapter → persist state changes
    agent_resp = agent_service.run_student_chat(
        db,
        student_id=current_student.id,
        classroom_id=assignment.classroom_id,
        assignment_id=request.assignment_id,
        question_id=request.question_id,
        message=request.message,
    )

    # Map internal response to HTTP response schema (stable API contract)
    return agent_schemas.StudentChatResponse(
        response=agent_resp.response,
        level=agent_resp.level,
        topic=agent_resp.topic,
        subject=agent_resp.subject,
        requires_quiz=agent_resp.requires_quiz,
        teacher_intimated=agent_resp.teacher_intimated,
        attention_priority=agent_resp.attention_priority,
        hints=agent_resp.hints,
        citations=agent_resp.citations,
        quiz_id=agent_resp.quiz_id,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/agents/teacher/insights/{classroom_id}
# ---------------------------------------------------------------------------

@router.post(
    "/teacher/insights/{classroom_id}",
    response_model=agent_schemas.TeacherInsightsResponse,
    summary="Get AI-generated classroom analytics and insights (teacher only)",
)
def teacher_agent_insights(
    classroom_id: int,
    request: agent_schemas.TeacherInsightsRequest = None,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    Teacher requests analytics and AI-generated insights for their classroom.

    Backend guarantees
    ------------------
    - teacher_id is taken from the JWT.
    - Classroom ownership is verified — teachers cannot query other classrooms.
    - If assignment_id is supplied in the body, it is verified to belong to
      this classroom before filtering analytics.

    The Teacher Agent receives pre-computed structured data from the DB
    (weak topics, level distributions, etc.) and must NOT query the DB itself.
    The agent enriches this with LLM-generated narrative reasoning.
    """
    assignment_id = request.assignment_id if request else None

    _resolve_and_validate_teacher_context(
        db,
        teacher_id=current_teacher.id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
    )

    # Orchestrate: build context → call adapter → inject notifications
    agent_resp = agent_service.run_teacher_insights(
        db,
        teacher_id=current_teacher.id,
        classroom_id=classroom_id,
        assignment_id=assignment_id,
    )

    # Map to HTTP response schema
    return agent_schemas.TeacherInsightsResponse(
        classroom_id=agent_resp.classroom_id,
        independent_completion_percentage=agent_resp.independent_completion_percentage,
        weak_topics=agent_resp.weak_topics,
        weak_subjects=agent_resp.weak_subjects,
        difficult_questions=agent_resp.difficult_questions,
        high_attention_students=agent_resp.high_attention_students,
        level_4_count=agent_resp.level_4_count,
        level_3_count=agent_resp.level_3_count,
        pending_notifications=agent_resp.pending_notifications,
        insights_text=agent_resp.insights_text,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/agents/teacher/insights/{classroom_id}  (convenience GET)
# ---------------------------------------------------------------------------

@router.get(
    "/teacher/insights/{classroom_id}",
    response_model=agent_schemas.TeacherInsightsResponse,
    summary="Get classroom analytics (GET variant — no assignment filter)",
)
def teacher_agent_insights_get(
    classroom_id: int,
    current_teacher: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """
    GET convenience endpoint — returns insights for the whole classroom.
    To filter by assignment, use the POST variant with assignment_id in body.
    """
    _resolve_and_validate_teacher_context(
        db,
        teacher_id=current_teacher.id,
        classroom_id=classroom_id,
        assignment_id=None,
    )

    agent_resp = agent_service.run_teacher_insights(
        db,
        teacher_id=current_teacher.id,
        classroom_id=classroom_id,
        assignment_id=None,
    )

    return agent_schemas.TeacherInsightsResponse(
        classroom_id=agent_resp.classroom_id,
        independent_completion_percentage=agent_resp.independent_completion_percentage,
        weak_topics=agent_resp.weak_topics,
        weak_subjects=agent_resp.weak_subjects,
        difficult_questions=agent_resp.difficult_questions,
        high_attention_students=agent_resp.high_attention_students,
        level_4_count=agent_resp.level_4_count,
        level_3_count=agent_resp.level_3_count,
        pending_notifications=agent_resp.pending_notifications,
        insights_text=agent_resp.insights_text,
    )
