from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

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


# ===========================================================================
# Level 3 Practice Quiz Integration Schemas
# ===========================================================================

class PracticeQuizStartRequest(BaseModel):
    """Body sent to POST /api/v1/student/quiz/start."""
    assignment_id: int
    question_id: Optional[int] = None
    topic: Optional[str] = None


class PracticeQuizQuestion(BaseModel):
    """
    Public practice question schema returned to React client.
    SECURITY NOTICE: correct_option is STRICTLY EXCLUDED.
    """
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str


class PracticeQuizStartResponse(BaseModel):
    """Returned by POST /api/v1/student/quiz/start."""
    quiz_id: int
    assignment_id: int
    question_id: Optional[int] = None
    topic: Optional[str] = None
    questions: List[PracticeQuizQuestion]


class PracticeQuizAnswerItem(BaseModel):
    """Single question answer submitted by student."""
    question_id: int
    selected_option: str = Field(..., description="Selected option key: 'A', 'B', 'C', or 'D'")


class PracticeQuizSubmitRequest(BaseModel):
    """Body sent to POST /api/v1/student/quiz/submit."""
    quiz_id: int
    assignment_id: int
    question_id: Optional[int] = None
    topic: Optional[str] = None
    answers: List[PracticeQuizAnswerItem]


class PracticeQuizResultResponse(BaseModel):
    """Result response returned to student after backend evaluation."""
    quiz_id: int
    score: int
    total_questions: int = 5
    percentage: float
    topic: Optional[str] = None
    level: int = Field(..., description="Backend-evaluated level (1=Doubt Cleared, 2=Guided Help, 4=Teacher Support)")
    teacher_intimated: bool = False
    recommendation: str
