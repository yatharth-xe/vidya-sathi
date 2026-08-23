"""Teacher Agent database tools — exactly ONE: get_student_progress (READ-ONLY).

Identity never comes from the LLM: ``agent_service.run_teacher_insights``
injects the authenticated teacher's id as a trusted scope before the adapter
runs and clears it afterwards. The tool delegates to
``learning_state_service.get_classroom_progress_for_teacher``, which re-verifies
classroom ownership. The tool cannot write anything.
"""
from typing import Any, Dict, Optional

from langchain_core.tools import tool

_TEACHER_SCOPE: Optional[Dict[str, Any]] = None


def set_teacher_scope(scope: Optional[Dict[str, Any]]) -> None:
    """Inject/clear the trusted teacher scope for the current run."""
    global _TEACHER_SCOPE
    _TEACHER_SCOPE = dict(scope) if scope else None


def get_teacher_scope() -> Optional[Dict[str, Any]]:
    return _TEACHER_SCOPE


@tool("get_student_progress")
def get_student_progress(
    classroom_id: int,
    assignment_id: int = 0,
    topic: str = "",
    level: int = 0,
) -> Dict[str, Any]:
    """Fetch learning-state progress records for YOUR classroom (read-only).

    Use this to analyze student progress: difficult topics, difficult
    questions, or which students need support. Pass classroom_id from the
    current context; optionally filter by assignment_id, topic or level
    (1-4). Records include student, topic/subject, level, quiz score,
    attention priority and teacher-notification status.
    """
    if not _TEACHER_SCOPE:
        return {
            "status": "rejected",
            "reason": "no_authorized_scope",
            "detail": "No authorized teacher scope for this session.",
        }

    from app.services.learning_state_service import (
        get_classroom_progress_for_teacher)

    return get_classroom_progress_for_teacher(
        teacher_id=_TEACHER_SCOPE["teacher_id"],
        classroom_id=int(classroom_id),
        assignment_id=int(assignment_id) or None,
        topic=topic.strip() or None,
        level=int(level) or None,
    )


TEACHER_DB_TOOLS = [get_student_progress]
