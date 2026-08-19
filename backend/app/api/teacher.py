from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.database import crud
from app.schemas import progress as progress_schemas
from app.services import progress_service

router = APIRouter(prefix="/teacher", tags=["teacher"])

@router.get("/analytics/{classroom_id}", response_model=progress_schemas.ClassroomAnalytics)
def get_classroom_analytics(
    classroom_id: int,
    db: Session = Depends(get_db)
):
    return progress_service.get_classroom_analytics(db, classroom_id)

@router.get("/notifications")
def get_notifications(
    teacher_id: int = 1, # Phase 1 stub parameter
    db: Session = Depends(get_db)
):
    notifications = crud.get_unread_notifications(db, teacher_id)
    return [
        {
            "id": n.id,
            "student_id": n.student_id,
            "classroom_id": n.classroom_id,
            "assignment_id": n.assignment_id,
            "topic": n.topic,
            "level": n.level,
            "priority": n.priority,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at
        } for n in notifications
    ]

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = crud.mark_notification_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"status": "ok"}
