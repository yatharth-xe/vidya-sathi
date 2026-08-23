"""Student Agent package.

Imports are intentionally lazy so that running `python -m agent.student_agent`
does not trigger a circular import / "found in sys.modules" RuntimeWarning
(`agent/__init__.py` previously imported `student_agent` eagerly while Python
was still executing that very module).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - typing only
    from agent.student_agent import StudentAgentRun

__all__ = ["StudentAgentRun", "ask_student_agent", "run_student_agent"]


def __getattr__(name: str):
    if name in __all__:
        from agent import student_agent as _student_agent

        return getattr(_student_agent, name)
    raise AttributeError(f"module 'agent' has no attribute {name!r}")

