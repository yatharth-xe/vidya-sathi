from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, get_current_teacher
from app.database import models, crud
from app.schemas import classroom as classroom_schemas
from app.services import classroom_service

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

@router.post("/", response_model=classroom_schemas.ClassroomResponse, status_code=status.HTTP_201_CREATED)
def create_classroom(
    classroom_in: classroom_schemas.ClassroomCreate,
    current_user: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    return classroom_service.create_new_classroom(db, classroom_in, teacher_id=current_user.id)

@router.get("/", response_model=List[classroom_schemas.ClassroomResponse])
def list_classrooms(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "teacher":
        return crud.get_classrooms_by_teacher(db, teacher_id=current_user.id)
    else:
        return crud.get_classrooms_by_student(db, student_id=current_user.id)

@router.get("/{classroom_id}", response_model=classroom_schemas.ClassroomResponse)
def get_classroom_details(
    classroom_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
    
    # Security check: Teacher owns or Student belongs
    if current_user.role == "teacher":
        if classroom.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not own this classroom"
            )
    else:
        if current_user not in classroom.students:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You are not enrolled in this classroom"
            )
            
    return classroom

@router.post("/{classroom_id}/enroll", response_model=classroom_schemas.ClassroomResponse)
def enroll(
    classroom_id: int,
    student_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
        
    target_student_id = current_user.id
    
    if current_user.role == "teacher":
        if classroom.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not own this classroom"
            )
        if not student_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teachers must specify student_id to enroll"
            )
        target_student_id = student_id

    updated_classroom = classroom_service.enroll_student(db, classroom_id, target_student_id)
    if not updated_classroom:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not enroll student in classroom. Ensure student ID is valid and has student role."
        )
    return updated_classroom

@router.post("/{classroom_id}/students/{student_id}", response_model=classroom_schemas.ClassroomResponse)
def add_student_to_classroom(
    classroom_id: int,
    student_id: int,
    current_user: models.User = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    classroom = crud.get_classroom(db, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
        
    if classroom.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this classroom"
        )

    updated_classroom = classroom_service.enroll_student(db, classroom_id, student_id)
    if not updated_classroom:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not add student to classroom. Ensure student ID is valid and has student role."
        )
    return updated_classroom
