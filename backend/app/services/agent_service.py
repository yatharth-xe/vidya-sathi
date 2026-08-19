from sqlalchemy.orm import Session
from app.database import crud
from app.agents.student_agent import handle_student_doubt
from app.agents.teacher_agent import generate_classroom_insights

def ask_student_agent(db: Session, classroom_id: int, student_id: int, query: str) -> str:
    # Phase 1: Message logging removed (Message model removed per spec).
    # In Phase 3 the ML engineer will wire this to StudentQuestionProgress.
    reply = handle_student_doubt(classroom_id, student_id, query)
    return reply

def get_teacher_insights(db: Session, classroom_id: int) -> str:
    return generate_classroom_insights(classroom_id)
