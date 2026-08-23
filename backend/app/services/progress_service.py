from sqlalchemy.orm import Session
from app.schemas import progress as progress_schemas
from app.services import analytics_service

def get_classroom_analytics(db: Session, classroom_id: int) -> progress_schemas.ClassroomAnalytics:
    """
    Delegates to deterministic analytics_service.
    """
    return analytics_service.get_classroom_analytics(db, classroom_id)
