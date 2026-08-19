from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.database import models, crud
from app.schemas import classroom as classroom_schemas
from app.services import classroom_service

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

@router.post("/", response_model=classroom_schemas.ClassroomResponse)
def create_classroom(
    classroom_in: classroom_schemas.ClassroomCreate,
    teacher_id: int = 1, # Phase 1 stub parameter before auth wiring
    db: Session = Depends(get_db)
):
    return classroom_service.create_new_classroom(db, classroom_in, teacher_id)

@router.get("/", response_model=List[classroom_schemas.ClassroomResponse])
def list_classrooms(
    db: Session = Depends(get_db)
):
    return db.query(models.Classroom).all()

@router.get("/{classroom_id}", response_model=classroom_schemas.ClassroomResponse)
def get_classroom_details(
    classroom_id: int,
    db: Session = Depends(get_db)
):
    classroom = classroom_service.get_classroom_details(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
    return classroom

@router.post("/{classroom_id}/enroll", response_model=classroom_schemas.ClassroomResponse)
def enroll(
    classroom_id: int,
    student_id: int = 2, # Phase 1 stub parameter
    db: Session = Depends(get_db)
):
    classroom = classroom_service.enroll_student(db, classroom_id, student_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not enroll student in classroom"
        )
    return classroom
