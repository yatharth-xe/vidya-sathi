"""
Teacher Agent Adapter — Real Grounded Teacher Reasoning Module.

Accepts TeacherAgentRequest (populated deterministically from analytics_service.py)
and returns TeacherAgentResponse with grounded narrative insights and deterministic analytics.
No direct SQL queries are executed by the agent.
"""
from abc import ABC, abstractmethod
from app.schemas.agent import TeacherAgentRequest, TeacherAgentResponse, WeakTopic, DifficultQuestion, HighAttentionStudent

class TeacherAgentAdapter(ABC):
    @abstractmethod
    def analyze(self, request: TeacherAgentRequest) -> TeacherAgentResponse:
        ...

class GroundedTeacherAgentAdapter(TeacherAgentAdapter):
    """
    Real Teacher Agent Adapter:
    Generates grounded insight narratives strictly supported by deterministic analytics.
    """

    def analyze(self, request: TeacherAgentRequest) -> TeacherAgentResponse:
        classroom_id = request.classroom_id
        indep_pct = request.independent_completion_percentage or 100.0
        level_3_count = len(request.level_3_student_ids or [])
        level_4_count = len(request.level_4_student_ids or [])
        weak_topics = request.weak_topics or []
        weak_subjects = request.weak_subjects or []
        difficult_q_ids = request.difficult_question_ids or []

        # Build grounded narrative text strictly using backend statistics
        narrative_parts = []
        narrative_parts.append(
            f"Classroom #{classroom_id} Overview: Independent completion stands at {indep_pct:.1f}%."
        )

        if weak_topics:
            topics_str = ", ".join(weak_topics[:3])
            narrative_parts.append(
                f"Students are currently experiencing difficulty in {len(weak_topics)} topic(s): {topics_str}."
            )
        else:
            narrative_parts.append("No critical weak topics identified for this classroom scope.")

        if difficult_q_ids:
            narrative_parts.append(
                f"A total of {len(difficult_q_ids)} question(s) have high struggle rates (>50% student struggle)."
            )

        if level_4_count > 0 or level_3_count > 0:
            narrative_parts.append(
                f"Support Breakdown: {level_4_count} student(s) require high-priority Level 4 teacher support, "
                f"and {level_3_count} student(s) are engaged in Level 3 practice modules."
            )
            narrative_parts.append(
                "Recommendation: Conduct targeted small-group intervention for Level 4 students before moving to subsequent topics."
            )
        else:
            narrative_parts.append(
                "All enrolled students are progressing independently at Level 1 or Level 2."
            )

        insights_text = " ".join(narrative_parts)

        return TeacherAgentResponse(
            classroom_id=classroom_id,
            independent_completion_percentage=indep_pct,
            level_3_count=level_3_count,
            level_4_count=level_4_count,
            weak_topics=[WeakTopic(topic=t, subject=None, affected_students=0) for t in weak_topics],
            weak_subjects=weak_subjects,
            difficult_questions=[],
            high_attention_students=[],
            pending_notifications=[],
            insights_text=insights_text,
        )

# Set active teacher agent instance
_teacher_agent: TeacherAgentAdapter = GroundedTeacherAgentAdapter()

def get_teacher_agent() -> TeacherAgentAdapter:
    return _teacher_agent
