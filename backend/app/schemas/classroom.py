from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.schemas.assignment import AssignmentResponse

class ClassroomBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomResponse(ClassroomBase):
    id: int
    teacher_id: int
    created_at: Optional[datetime] = None
    teacher: Optional[UserResponse] = None
    students: List[UserResponse] = []
    assignments: List[AssignmentResponse] = []

    class Config:
        from_attributes = True
