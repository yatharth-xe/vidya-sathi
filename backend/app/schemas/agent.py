from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

# Student Agent Schemas
class StudentChatRequest(BaseModel):
    assignment_id: int
    question_id: Optional[int] = None
    message: str

class StudentChatResponse(BaseModel):
    response: str
    level: int = 1
    topic: Optional[str] = None
    subject: Optional[str] = None
    requires_quiz: bool = False
    teacher_intimated: bool = False

# Teacher Agent Schemas
class TeacherInsightsRequest(BaseModel):
    classroom_id: int

class WeakTopic(BaseModel):
    topic: str
    subject: Optional[str] = None
    affected_students: int = 0

class DifficultQuestion(BaseModel):
    question_id: int
    question_text: str
    difficulty_percentage: float = 0.0
    students_struggling: int = 0

class HighAttentionStudent(BaseModel):
    student_id: int
    name: str
    level: int
    topics: List[str] = []

class TeacherInsightsResponse(BaseModel):
    classroom_id: int
    independent_completion_percentage: float = 0.0
    weak_topics: List[WeakTopic] = []
    weak_subjects: List[str] = []
    difficult_questions: List[DifficultQuestion] = []
    high_attention_students: List[HighAttentionStudent] = []
    level_4_count: int = 0
    level_3_count: int = 0
