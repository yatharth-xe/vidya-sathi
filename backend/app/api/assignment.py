from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
from app.core.config import settings
from app.core.dependencies import get_db
from app.database import models, crud
from app.schemas import assignment as assignment_schemas
from app.services import assignment_service

router = APIRouter(prefix="/assignments", tags=["assignments"])

@router.post("/", response_model=assignment_schemas.AssignmentResponse)
def create_assignment(
    assignment_in: assignment_schemas.AssignmentCreate,
    db: Session = Depends(get_db)
):
    return assignment_service.create_new_assignment(db, assignment_in)

@router.get("/classroom/{classroom_id}", response_model=List[assignment_schemas.AssignmentResponse])
def list_classroom_assignments(
    classroom_id: int,
    db: Session = Depends(get_db)
):
    return crud.get_assignments_by_classroom(db, classroom_id)

@router.post("/submit", response_model=assignment_schemas.SubmissionResponse)
def submit_assignment(
    submission_in: assignment_schemas.SubmissionCreate,
    student_id: int = 2, # Phase 1 stub parameter
    db: Session = Depends(get_db)
):
    return assignment_service.submit_student_assignment(db, submission_in, student_id)

@router.patch("/submissions/{submission_id}/grade", response_model=assignment_schemas.SubmissionResponse)
def grade_submission(
    submission_id: int,
    grade_in: assignment_schemas.GradeSubmission,
    db: Session = Depends(get_db)
):
    submission = assignment_service.grade_submission(db, submission_id, grade_in.grade, grade_in.feedback)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission

@router.get("/{assignment_id}", response_model=assignment_schemas.AssignmentResponse)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment

@router.post("/{assignment_id}/upload-pdf")
async def upload_pdf(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"assignment_{assignment_id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    assignment.file_path = file_path
    db.commit()
    db.refresh(assignment)
    
    return {"message": "File uploaded successfully", "file_path": file_path}

@router.post("/{assignment_id}/questions", response_model=assignment_schemas.AssignmentQuestionResponse)
def create_question(
    assignment_id: int,
    question_in: assignment_schemas.AssignmentQuestionBase,
    db: Session = Depends(get_db)
):
    assignment = crud.get_assignment(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return crud.create_assignment_question(
        db,
        assignment_id=assignment_id,
        question_number=question_in.question_number,
        question_text=question_in.question_text,
        subject=question_in.subject,
        topic=question_in.topic
    )

@router.get("/{assignment_id}/questions", response_model=List[assignment_schemas.AssignmentQuestionResponse])
def list_questions(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    return crud.get_questions_by_assignment(db, assignment_id)
