from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class AssignmentQuestionBase(BaseModel):
    question_number: int
    question_text: str
    subject: Optional[str] = None
    topic: Optional[str] = None

class AssignmentQuestionCreate(AssignmentQuestionBase):
    assignment_id: int

class AssignmentQuestionResponse(AssignmentQuestionBase):
    id: int
    assignment_id: int

    class Config:
        from_attributes = True

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None

class AssignmentCreate(AssignmentBase):
    classroom_id: int

class AssignmentResponse(AssignmentBase):
    id: int
    classroom_id: int
    file_path: Optional[str] = None
    created_at: Optional[datetime] = None
    questions: List[AssignmentQuestionResponse] = []

    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    status: str = "pending"
    grade: Optional[float] = None
    feedback: Optional[str] = None

class SubmissionCreate(BaseModel):
    assignment_id: int

class SubmissionResponse(SubmissionBase):
    id: int
    assignment_id: int
    student_id: int
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GradeSubmission(BaseModel):
    grade: float
    feedback: Optional[str] = None
