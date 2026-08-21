"""
Teacher Agent Adapter — Integration boundary for ML Member 3.

ARCHITECTURE
============
API route
    ↓
agent_service.run_teacher_insights()
    ↓
TeacherAgentAdapter.analyze()     ← ML MEMBER 3 PLUGS IN HERE
    ↓
Actual LLM analytics / risk reasoning

HOW TO PLUG IN YOUR IMPLEMENTATION
===================================
1. Implement a class that satisfies the TeacherAgentAdapter interface below.
2. Replace the DefaultTeacherAgentAdapter instantiation at the bottom of
   this file with your implementation:

       _teacher_agent = YourTeacherAgentImpl()

3. Your class MUST:
   - Accept a TeacherAgentRequest
   - Return a TeacherAgentResponse
   - Never execute SQL directly — all data is pre-loaded in the request
   - Return properly typed Pydantic objects (not raw dicts)

4. The TeacherAgentRequest already contains:
   - student_progress_summary      list of progress rows
   - weak_topics                   pre-computed from DB
   - weak_subjects                 pre-computed from DB
   - level_3_student_ids           pre-computed
   - level_4_student_ids           pre-computed
   - difficult_question_ids        pre-computed
   - independent_completion_percentage

5. You MAY augment / refine these with LLM reasoning.
   You MUST NOT bypass them by querying the DB directly.

DO NOT EDIT below the "--- PLUG-IN POINT ---" comment unless you are
the ML engineer implementing the Teacher Agent.
"""
from abc import ABC, abstractmethod
from app.schemas.agent import TeacherAgentRequest, TeacherAgentResponse


# ===========================================================================
# Abstract interface (contract definition — do NOT modify)
# ===========================================================================

class TeacherAgentAdapter(ABC):
    """
    Interface the Teacher Agent implementation must satisfy.
    ML Member 3 sub-classes this and implements `analyze`.
    """

    @abstractmethod
    def analyze(self, request: TeacherAgentRequest) -> TeacherAgentResponse:
        """
        Analyze classroom data and return a structured insights response.

        Parameters
        ----------
        request : TeacherAgentRequest
            Pre-populated by the backend service with structured DB data.
            The agent must NOT run SQL — all needed data is in the request.

        Returns
        -------
        TeacherAgentResponse
            Must include classroom_id.
            Should populate: weak_topics, weak_subjects, difficult_questions,
            high_attention_students, independent_completion_percentage,
            level_3_count, level_4_count, pending_notifications, insights_text.
        """
        ...


# ===========================================================================
# Default placeholder adapter (used until ML member plugs in)
# ===========================================================================

class DefaultTeacherAgentAdapter(TeacherAgentAdapter):
    """
    *** PLACEHOLDER — for integration testing only ***

    Passes the pre-computed backend data straight through to the response
    without any LLM reasoning. Produces a placeholder insights_text.

    ML Member 3: replace this class (or swap _teacher_agent below) with
    your actual implementation that adds narrative reasoning.
    """

    def analyze(self, request: TeacherAgentRequest) -> TeacherAgentResponse:
        from app.schemas.agent import WeakTopic

        # Pass-through computed metrics from the backend
        weak_topic_models = [
            WeakTopic(topic=t, subject=None, affected_students=0)
            for t in (request.weak_topics or [])
        ]

        insights_text = (
            "[PLACEHOLDER — Teacher Agent not yet connected] "
            f"Classroom {request.classroom_id}: "
            f"{request.independent_completion_percentage:.1f}% independent completion. "
            f"Level-3 students: {len(request.level_3_student_ids or [])}. "
            f"Level-4 students: {len(request.level_4_student_ids or [])}. "
            f"Weak topics: {', '.join(request.weak_topics or []) or 'none identified'}. "
            f"When ML Member 3 wires the Teacher Agent, this will contain "
            f"LLM-generated risk reasoning and actionable recommendations."
        )

        return TeacherAgentResponse(
            classroom_id=request.classroom_id,
            independent_completion_percentage=request.independent_completion_percentage or 100.0,
            level_3_count=len(request.level_3_student_ids or []),
            level_4_count=len(request.level_4_student_ids or []),
            weak_topics=weak_topic_models,
            weak_subjects=request.weak_subjects or [],
            difficult_questions=[],
            high_attention_students=[],
            pending_notifications=[],
            insights_text=insights_text,
        )


# ---------------------------------------------------------------------------
# --- PLUG-IN POINT ---
# ML Member 3: replace DefaultTeacherAgentAdapter() with your implementation.
# ---------------------------------------------------------------------------
_teacher_agent: TeacherAgentAdapter = DefaultTeacherAgentAdapter()


def get_teacher_agent() -> TeacherAgentAdapter:
    """Return the active Teacher Agent adapter. Called by agent_service."""
    return _teacher_agent
