"""The single tool exposed to the Student Agent."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import tool

from retrieval.retriever import retrieve


def retrieve_ncert_knowledge(query: str, top_k: int = 10) -> dict[str, Any]:
    """Call the Chemistry-gated NCERT retriever."""
    return retrieve(query=query, top_k=top_k)


@tool("ncert_retriever")
def ncert_retriever(query: str, top_k: int = 10) -> dict[str, Any]:
    """Retrieve NCERT textbook chunks for a student question.

    Use this tool whenever the question requires Class 11/12 NCERT knowledge.
    """
    return retrieve_ncert_knowledge(query=query, top_k=top_k)


STUDENT_AGENT_TOOLS = [ncert_retriever]
