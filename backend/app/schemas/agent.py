"""
Agent integration contract schemas.

These Pydantic models form the STABLE API boundary between:
  - FastAPI routes (Member 1 owns)
  - Student Agent / RAG implementation (Member 2 owns)
  - Teacher Agent / analytics reasoning (Member 3 owns)

DO NOT add arbitrary fields here without coordinating across teams.
DO NOT expose internal SQLAlchemy models through these schemas.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ===========================================================================
# Shared sub-models
# ===========================================================================

class QuestionContext(BaseModel):
    """Snapshot of a single assignment question, passed to agents as context."""
    question_id: int
    question_number: int
    question_text: str
    subject: Optional[str] = None
    topic: Optional[str] = None


class ProgressContext(BaseModel):
    """Current student progress state for a question, passed to Student Agent."""
    progress_id: int
    level: int = 1                          # 1=independent, 2=needs hints, 3=quiz, 4=high-risk
    attention_priority: str = "normal"      # "normal" | "high"
    teacher_intimated: bool = False
    initial_attempt: Optional[str] = None
    quiz_score: Optional[float] = None
    subject: Optional[str] = None
    topic: Optional[str] = None


# ===========================================================================
# STUDENT AGENT — Request / Response
# ===========================================================================

class StudentAgentRequest(BaseModel):
    """
    Sent by the FastAPI route to the Student Agent adapter.

    NOTE: student_id comes from JWT — never from the client body.
    classroom_id is resolved from the JWT + assignment lookup.
    """
    # Identity (all resolved from JWT + DB validation — never from client)
    student_id: int
    classroom_id: int
    assignment_id: int
    question_id: Optional[int] = None

    # The student's message / doubt
    message: str

    # Context injected by the backend (agent must not fetch these itself)
    question_context: Optional[QuestionContext] = None
    current_progress: Optional[ProgressContext] = None

    # Pass-through metadata the ML layer may find useful
    student_name: Optional[str] = None


class StudentAgentResponse(BaseModel):
    """
    Returned by the Student Agent adapter to the FastAPI route.

    The route validates level (1-4) and persists any state changes
    through the controlled service layer — the agent itself does NOT
    write directly to the database.
    """
    # Core response fields (REQUIRED from ML)
    response: str = Field(..., description="The agent's reply text shown to the student")
    level: int = Field(
        1,
        ge=1, le=4,
        description="Updated learning level: 1=independent, 2=needs hints, 3=practice quiz, 4=high-risk"
    )

    # Classification the ML layer should determine
    topic: Optional[str] = Field(None, description="Topic of the question/doubt")
    subject: Optional[str] = Field(None, description="Subject area")

    # Flags that drive backend state mutations
    requires_quiz: bool = Field(False, description="True → backend creates a quiz session")
    teacher_intimated: bool = Field(False, description="True → backend creates teacher notification")

    # Optional enrichment (ML may or may not populate these)
    attention_priority: str = Field("normal", description="'normal' or 'high'")
    hints: Optional[List[str]] = Field(None, description="Progressive hints for level-2 guidance")
    citations: Optional[List[str]] = Field(None, description="RAG source references / page numbers")
    quiz_id: Optional[int] = Field(None, description="Quiz session ID if requires_quiz=True")

    # Free-form extras the ML layer can use without breaking the contract
    metadata: Optional[Dict[str, Any]] = Field(None, description="Unstructured ML-layer metadata")


# ---------------------------------------------------------------------------
# HTTP-layer wrapper (what the client actually sends / receives)
# ---------------------------------------------------------------------------

class StudentChatRequest(BaseModel):
    """Body sent by the frontend client to POST /api/v1/agents/student/chat."""
    assignment_id: int
    question_id: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=4000)


class StudentChatResponse(BaseModel):
    """Body returned to the frontend client."""
    response: str
    level: int = 1
    topic: Optional[str] = None
    subject: Optional[str] = None
    requires_quiz: bool = False
    teacher_intimated: bool = False
    attention_priority: str = "normal"
    hints: Optional[List[str]] = None
    citations: Optional[List[str]] = None
    quiz_id: Optional[int] = None


# ===========================================================================
# TEACHER AGENT — Request / Response
# ===========================================================================

class TeacherAgentRequest(BaseModel):
    """
    Sent by the FastAPI route to the Teacher Agent adapter.

    NOTE: teacher_id comes from JWT.
    Classroom ownership is verified before this object is constructed.
    """
    teacher_id: int
    classroom_id: int
    assignment_id: Optional[int] = None        # None → whole classroom

    # Structured analytics snapshot — assembled by the backend service layer
    # so the agent never runs SQL itself.
    student_progress_summary: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Per-student, per-question progress rows from student_question_progress"
    )
    weak_topics: Optional[List[str]] = None
    weak_subjects: Optional[List[str]] = None
    level_3_student_ids: Optional[List[int]] = None
    level_4_student_ids: Optional[List[int]] = None
    difficult_question_ids: Optional[List[int]] = None
    independent_completion_percentage: Optional[float] = None


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
    attention_priority: str = "normal"


class NotificationSummary(BaseModel):
    """Notification row summarised for the teacher agent's awareness."""
    notification_id: int
    student_id: int
    student_name: Optional[str] = None
    topic: Optional[str] = None
    level: Optional[int] = None
    priority: str = "normal"
    message: str
    created_at: Optional[datetime] = None


class TeacherAgentResponse(BaseModel):
    """
    Returned by the Teacher Agent adapter to the FastAPI route.

    The ML layer populates the analytics narrative; the backend
    supplies the structured data inputs.
    """
    # Required from ML
    classroom_id: int

    # Computed metrics (backend pre-computes; ML may override/enrich)
    independent_completion_percentage: float = 0.0
    level_3_count: int = 0
    level_4_count: int = 0

    # Structured lists — ML may augment but must use typed models
    weak_topics: List[WeakTopic] = []
    weak_subjects: List[str] = []
    difficult_questions: List[DifficultQuestion] = []
    high_attention_students: List[HighAttentionStudent] = []

    # Notifications already pending for this teacher / classroom
    pending_notifications: List[NotificationSummary] = []

    # Free-form narrative generated by the ML layer (optional)
    insights_text: Optional[str] = Field(
        None,
        description="Natural-language summary generated by the Teacher Agent LLM"
    )

    # Free-form extras
    metadata: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# HTTP-layer wrapper (what the client sends to the teacher endpoint)
# ---------------------------------------------------------------------------

class TeacherInsightsRequest(BaseModel):
    """Body for POST /api/v1/agents/teacher/insights (classroom_id also accepted via path)."""
    assignment_id: Optional[int] = None


class TeacherInsightsResponse(BaseModel):
    """Simplified response returned to the teacher client."""
    classroom_id: int
    independent_completion_percentage: float = 0.0
    weak_topics: List[WeakTopic] = []
    weak_subjects: List[str] = []
    difficult_questions: List[DifficultQuestion] = []
    high_attention_students: List[HighAttentionStudent] = []
    level_4_count: int = 0
    level_3_count: int = 0
    pending_notifications: List[NotificationSummary] = []
    insights_text: Optional[str] = None
