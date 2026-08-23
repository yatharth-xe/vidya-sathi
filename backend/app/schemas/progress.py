from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class StudentQuestionProgressResponse(BaseModel):
    id: int
    classroom_id: int
    assignment_id: int
    question_id: Optional[int] = None
    student_id: int
    subject: Optional[str] = None
    topic: Optional[str] = None
    level: int = 1
    teacher_intimated: bool = False
    attention_priority: str = "normal"
    initial_attempt: Optional[str] = None
    quiz_score: Optional[float] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudentProgressSummary(BaseModel):
    student_id: int
    name: str
    level_1_count: int = 0
    level_2_count: int = 0
    level_3_count: int = 0
    level_4_count: int = 0
    risk_level: str = "low" # "low", "medium", "high"

class ClassroomAnalytics(BaseModel):
    classroom_id: int
    total_students: int = 0
    independent_completion_percentage: float = 0.0
    level_distribution: Dict[str, int] = {}
    weak_topics: List[str] = []
    high_attention_students: List[StudentProgressSummary] = []
