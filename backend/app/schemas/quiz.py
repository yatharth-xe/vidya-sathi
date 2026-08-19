from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class QuizAttemptCreate(BaseModel):
    assignment_id: int
    question_id: Optional[int] = None
    topic: Optional[str] = None
    quiz_question: str
    student_answer: Optional[str] = None
    correct: Optional[bool] = None
    score: Optional[float] = None

class QuizAttemptResponse(QuizAttemptCreate):
    id: int
    student_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
