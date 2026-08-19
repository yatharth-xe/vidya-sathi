from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.database import crud
from app.schemas import progress as progress_schemas

router = APIRouter(prefix="/student", tags=["student"])

@router.get("/progress/{assignment_id}", response_model=List[progress_schemas.StudentQuestionProgressResponse])
def get_progress(
    assignment_id: int,
    student_id: int = 2, # Phase 1 stub parameter before auth wiring
    db: Session = Depends(get_db)
):
    return crud.get_assignment_progress_for_student(db, student_id, assignment_id)
