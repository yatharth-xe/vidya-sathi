from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.schemas import agent as agent_schemas
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/student/chat", response_model=agent_schemas.StudentChatResponse)
def student_agent_chat(
    request: agent_schemas.StudentChatRequest,
    student_id: int = 2, # Phase 1 stub parameter before auth wiring
    db: Session = Depends(get_db)
):
    # Phase 1 stub response (agent integration will connect in Phase 3)
    reply = agent_service.ask_student_agent(
        db,
        classroom_id=1,
        student_id=student_id,
        query=request.message
    )
    return agent_schemas.StudentChatResponse(
        response=reply,
        level=1,
        topic="General Conceptual Doubt",
        subject="General",
        requires_quiz=False,
        teacher_intimated=False
    )

@router.get("/teacher/insights/{classroom_id}", response_model=agent_schemas.TeacherInsightsResponse)
def teacher_agent_insights(
    classroom_id: int,
    db: Session = Depends(get_db)
):
    # Phase 1 stub response
    insights_text = agent_service.get_teacher_insights(db, classroom_id)
    return agent_schemas.TeacherInsightsResponse(
        classroom_id=classroom_id,
        independent_completion_percentage=75.0,
        weak_topics=[
            agent_schemas.WeakTopic(topic="Quadratic Equations", subject="Mathematics", affected_students=3)
        ],
        weak_subjects=["Mathematics"],
        difficult_questions=[],
        high_attention_students=[],
        level_4_count=0,
        level_3_count=1
    )
