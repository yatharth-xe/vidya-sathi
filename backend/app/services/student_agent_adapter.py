"""
Student Agent Adapter — Integration boundary for ML Member 2.

ARCHITECTURE
============
API route
    ↓
agent_service.run_student_chat()
    ↓
StudentAgentAdapter.chat()      ← NCERTStudentAgentAdapter (connected)
    ↓
NCERT Student Agent (Vidya Sathi Agent/agent/student_agent.py)
    ↓
ncert_retriever → BM25 / BGE / Chroma / RRF / Chemistry Gate

The adapter never touches SQLAlchemy / CRUD / DB models. All persistence
(level changes, teacher notifications) is handled by agent_service.
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
        """
        ...


# ===========================================================================
# Default placeholder adapter (kept for reference / fallback testing)
# ===========================================================================

class DefaultStudentAgentAdapter(StudentAgentAdapter):
    """*** PLACEHOLDER — for integration testing only ***"""

    def chat(self, request: StudentAgentRequest) -> StudentAgentResponse:
        question_text = (
            request.question_context.question_text
            if request.question_context
            else "your question"
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
            f"Current level: {current_level}."
        )
        return StudentAgentResponse(
            response=reply,
            level=current_level,
            topic=request.question_context.topic if request.question_context else None,
            subject=request.question_context.subject if request.question_context else None,
            requires_quiz=False,
            teacher_intimated=False,
            attention_priority="normal",
            hints=None,
            citations=None,
        )


# ===========================================================================
# NCERT Student Agent adapter (ML Member 2's validated implementation)
# ===========================================================================
# - The NCERT Agent project ("<workspace>/Vidya Sathi Agent/") is FROZEN.
#   We only add its project root to sys.path so that
#   `from agent.student_agent import run_student_agent` resolves.
# - The NCERT Agent is synchronous and does not stream; this adapter is
#   therefore synchronous, matching the existing contract.

import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from pathlib import Path
from typing import Any, List, Optional

logger = logging.getLogger("uvicorn.error")

# Timeout for one full agent run (LLM + retrieval).
_AGENT_TIMEOUT_SECONDS = 100.0
_TOP_K = 5

# Safe user-facing error messages (never expose internals).
_MSG_AGENT_UNAVAILABLE = (
    "I'm sorry — the AI tutor service is temporarily unavailable. "
    "Please try again in a few moments."
)
_MSG_INVALID_QUERY = "Please enter a valid question so I can help you."

# ---------------------------------------------------------------------------
# sys.path bootstrap — makes the frozen NCERT Agent package importable.
# Path: backend/app/services/student_agent_adapter.py -> workspace root
# ---------------------------------------------------------------------------
_AGENT_PROJECT_ROOT = Path(__file__).resolve().parents[3] / "Vidya Sathi Agent"

_agent_module_cache: dict = {}


def _load_ncert_agent_modules():
    """
    Lazily import and cache the NCERT Agent entry points.
    Returns (run_student_agent, format_source_citation).
    """
    if "run_student_agent" in _agent_module_cache:
        cached = _agent_module_cache
        return cached["run_student_agent"], cached["format_source_citation"]

    if not _AGENT_PROJECT_ROOT.is_dir():
        raise ModuleNotFoundError("NCERT Agent project directory not found")
    root_str = str(_AGENT_PROJECT_ROOT)
    if root_str not in sys.path:
        # Append (not prepend) so existing app.* imports always win.
        sys.path.append(root_str)

    from agent.student_agent import run_student_agent  
    from agent.citations import format_source_citation 

    _agent_module_cache["run_student_agent"] = run_student_agent
    _agent_module_cache["format_source_citation"] = format_source_citation
    return run_student_agent, format_source_citation

class NCERTStudentAgentAdapter(StudentAgentAdapter):
    """
    Adapter around the validated NCERT Student Agent.

    Responsibilities kept OUT of this adapter (per contract):
    - level 1-4 decisions, quiz creation, teacher notifications
      -> handled by agent_service + existing Vidya Sathi logic
    - any database access
    """

    # Single worker: agent runs are serialized (the retriever's in-process
    # singletons are not designed for parallel first-init).
    _executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ncert-agent")

    def chat(self, request: StudentAgentRequest) -> StudentAgentResponse:
        # --- 1. Validate query -------------------------------------------
        message = (request.message or "").strip() if isinstance(request.message, str) else ""
        if not message:
            return self._safe_response(request, _MSG_INVALID_QUERY)

        # --- 2. Build the NCERT query (student question stays primary) ---
        query = self._build_query(request)

        # --- 3. Run the frozen NCERT agent -------------------------------
        try:
            run_student_agent, format_source_citation = _load_ncert_agent_modules()
        except Exception:
            logger.exception("NCERT Student Agent modules could not be imported")
            return self._safe_response(request, _MSG_AGENT_UNAVAILABLE)

        start = time.perf_counter()
        try:
            learning_context = self._build_learning_context(request)
            future = self._executor.submit(
                run_student_agent, query, learning_context=learning_context
            )
            result = future.result(timeout=_AGENT_TIMEOUT_SECONDS)
        except FutureTimeoutError:
            logger.error("NCERT Student Agent timed out after %.0fs", _AGENT_TIMEOUT_SECONDS)
            return self._safe_response(request, _MSG_AGENT_UNAVAILABLE)
        except Exception:
            logger.exception("NCERT Student Agent runtime failure")
            return self._safe_response(request, _MSG_AGENT_UNAVAILABLE)
        elapsed = time.perf_counter() - start
        logger.info(
            "NCERT Student Agent answered in %.2fs (route=%s, retriever_called=%s)",
            elapsed, getattr(result, "route", ""), getattr(result, "retriever_called", False),
        )

        # --- 4. Map to the Vidya Sathi contract --------------------------
        citations = self._format_citations(result, format_source_citation)
        metadata = {
            "route": getattr(result, "route", "") or None,
            "retriever_called": bool(getattr(result, "retriever_called", False)),
            "top_k": _TOP_K,
            "latency_seconds": round(elapsed, 2),
            # Web sources are tracked separately; NCERT citations remain untouched.
            "web_sources_count": len(getattr(result, "web_sources", None) or []),
        }

        return self._safe_response(
            request,
            getattr(result, "final_answer", "") or _MSG_AGENT_UNAVAILABLE,
            citations=citations,
            metadata=metadata,
        )

    @staticmethod
    def _build_query(request: StudentAgentRequest) -> str:
        """Student's message is primary; compact question context is prepended only."""
        ctx = request.question_context
        if not ctx:
            return request.message.strip()

        parts: List[str] = []
        if ctx.subject:
            parts.append(f"Subject: {ctx.subject}")
        if ctx.topic:
            parts.append(f"Topic: {ctx.topic}")
        if ctx.question_text:
            parts.append(f"Assignment question: {ctx.question_text}")

        if not parts:
            return request.message.strip()
        return "Context — " + "; ".join(parts) + "\n\nStudent question: " + request.message.strip()

    @staticmethod
    def _build_learning_context(request: StudentAgentRequest) -> Optional[dict]:
        """
        Trusted, read-only learning-state snapshot passed to the NCERT Agent's
        student_learning_state tool. Built ONLY from backend-owned progress
        data (request.current_progress). No student_id / identity fields are
        exposed, and the tool can never write back — level/quiz decisions
        remain owned by agent_service + quiz_service.
        """
        progress = request.current_progress
        if not progress:
            return None

        context: dict = {
            "level": progress.level,
            "teacher_intimated": bool(progress.teacher_intimated),
            "attention_priority": progress.attention_priority,
        }
        if progress.quiz_score is not None:
            context["quiz_score"] = progress.quiz_score
        if progress.initial_attempt is not None:
            context["initial_attempt"] = progress.initial_attempt
        # Topic/subject are already part of the question context; not duplicated here.
        return context

    @staticmethod
    def _format_citations(result: Any, format_source_citation) -> Optional[List[str]]:
        """Citations built ONLY from actual retriever metadata — never invented."""
        sources = getattr(result, "retrieved_sources", None) or []
        citations: List[str] = []
        for source in sources:
            if not isinstance(source, dict):
                continue
            citation = format_source_citation(source)
            if citation and citation != "[NCERT]" and citation not in citations:
                citations.append(citation)
        return citations or None

    def _safe_response(
        self,
        request: StudentAgentRequest,
        response_text: str,
        citations: Optional[List[str]] = None,
        metadata: Optional[dict] = None,
    ) -> StudentAgentResponse:
        """
        Build a contract-safe response.

        Level / attention_priority preserved from existing Vidya Sathi
        progress state (the NCERT Agent does NOT determine learning state).
        topic / subject come only from the existing question context.
        requires_quiz / teacher_intimated stay False — existing Vidya Sathi
        logic owns these decisions.
        """
        progress = request.current_progress
        ctx = request.question_context
        return StudentAgentResponse(
            response=response_text,
            level=progress.level if progress else 1,
            topic=ctx.topic if ctx else None,
            subject=ctx.subject if ctx else None,
            requires_quiz=False,
            teacher_intimated=False,
            attention_priority=progress.attention_priority if progress else "normal",
            hints=None,
            citations=citations,
            metadata=metadata,
        )


# ---------------------------------------------------------------------------
# --- PLUG-IN POINT --- (active implementation)
# ---------------------------------------------------------------------------
_student_agent: StudentAgentAdapter = NCERTStudentAgentAdapter()


def get_student_agent() -> StudentAgentAdapter:
    """Return the active Student Agent adapter. Called by agent_service."""
    return _student_agent