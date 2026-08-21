"""
Student Agent Adapter — Integration boundary for ML Member 2.

ARCHITECTURE
============
API route
    ↓
agent_service.run_student_chat()
    ↓
StudentAgentAdapter.chat()     ← ML MEMBER 2 PLUGS IN HERE
    ↓
Actual RAG / LLM reasoning

HOW TO PLUG IN YOUR IMPLEMENTATION
===================================
1. Implement a class that satisfies the StudentAgentAdapter interface below.
2. Replace the DefaultStudentAgentAdapter instantiation at the bottom of
   this file with your implementation:

       _student_agent = YourStudentAgentImpl()

3. Your class MUST:
   - Accept a StudentAgentRequest
   - Return a StudentAgentResponse
   - Never execute SQL directly (use the service layer via the context
     objects provided in StudentAgentRequest)
   - Validate level is 1–4 (the route also validates, but defence-in-depth)

4. You MAY import from:
   - app.schemas.agent (types only)
   - Your own RAG/LLM modules

5. You MUST NOT import from:
   - app.database.crud  (no SQL from agents)
   - app.database.models
   - sqlalchemy

DO NOT EDIT below the "--- PLUG-IN POINT ---" comment unless you are
the ML engineer implementing the Student Agent.
"""
from abc import ABC, abstractmethod
from app.schemas.agent import StudentAgentRequest, StudentAgentResponse


# ===========================================================================
# Abstract interface (contract definition — do NOT modify)
# ===========================================================================

class StudentAgentAdapter(ABC):
    """
    Interface the Student Agent implementation must satisfy.
    ML Member 2 sub-classes this and implements `chat`.
    """

    @abstractmethod
    def chat(self, request: StudentAgentRequest) -> StudentAgentResponse:
        """
        Process a student doubt/message and return a structured response.

        Parameters
        ----------
        request : StudentAgentRequest
            Fully populated by the backend service before calling this method.
            Includes student_id, classroom_id, question context, and current
            progress level from the DB — the agent does NOT fetch these.

        Returns
        -------
        StudentAgentResponse
            The agent must set at minimum: response (str), level (int 1-4).
            Optional: topic, subject, requires_quiz, teacher_intimated,
                      hints, citations, attention_priority.
        """
        ...


# ===========================================================================
# Default placeholder adapter (used until ML member plugs in)
# ===========================================================================

class DefaultStudentAgentAdapter(StudentAgentAdapter):
    """
    *** PLACEHOLDER — for integration testing only ***

    Returns a structured mock response so the full API contract can be
    validated end-to-end without the real LLM implementation.

    ML Member 2: replace this class (or swap _student_agent below) with
    your actual RAG-backed implementation.
    """

    def chat(self, request: StudentAgentRequest) -> StudentAgentResponse:
        # Build a context-aware placeholder reply
        question_text = (
            request.question_context.question_text
            if request.question_context
            else "your question"
        )
        topic = (
            request.question_context.topic
            if request.question_context
            else None
        )
        subject = (
            request.question_context.subject
            if request.question_context
            else None
        )
        current_level = (
            request.current_progress.level
            if request.current_progress
            else 1
        )

        reply = (
            f"[PLACEHOLDER — Student Agent not yet connected] "
            f"You asked: '{request.message}'. "
            f"Related question: '{question_text}'. "
            f"Current level: {current_level}. "
            f"When the ML engineer wires the RAG pipeline, this will be a "
            f"real, context-aware response."
        )

        return StudentAgentResponse(
            response=reply,
            level=current_level,          # keep existing level until agent decides
            topic=topic,
            subject=subject,
            requires_quiz=False,
            teacher_intimated=False,
            attention_priority="normal",
            hints=None,
            citations=None,
        )


# ---------------------------------------------------------------------------
# --- PLUG-IN POINT ---
# ML Member 2: replace DefaultStudentAgentAdapter() with your implementation.
# ---------------------------------------------------------------------------
_student_agent: StudentAgentAdapter = DefaultStudentAgentAdapter()


def get_student_agent() -> StudentAgentAdapter:
    """Return the active Student Agent adapter. Called by agent_service."""
    return _student_agent
