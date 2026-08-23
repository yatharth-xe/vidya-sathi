"""Citation helpers for the Student Agent.

Citations are built ONLY from metadata returned by the `ncert_retriever`
tool (subject, chapter_name, section_name, page_start, page_end,
source_file). No line numbers, chunk ids, or invented references are ever
emitted.
"""

from __future__ import annotations

from typing import Any


def _clean(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text.lower() in {"none", "null"} else text


def format_source_citation(source: dict[str, Any]) -> str:
    """Format one retrieved chunk's metadata into a stable citation string."""
    subject = _clean(source.get("subject"))
    chapter = _clean(source.get("chapter_name"))
    section = _clean(source.get("section_name"))

    parts = [part for part in (subject, chapter, section) if part]
    label = " | ".join(parts)

    page_start = _clean(source.get("page_start"))
    page_end = _clean(source.get("page_end"))
    pages = ""
    if page_start and page_end:
        if page_start == page_end:
            pages = f"p. {page_start}"
        else:
            pages = f"pp. {page_start}-{page_end}"
    elif page_start:
        pages = f"p. {page_start}"

    citation = "[NCERT"
    if label:
        citation += f" | {label}"
    if pages:
        citation += f" | {pages}"
    citation += "]"
    return citation


def format_sources_block(sources: list[dict[str, Any]], max_sources: int = 5) -> str:
    """Render a deduplicated Sources block from actual retriever results."""
    seen: set[str] = set()
    lines: list[str] = []
    for index, source in enumerate(sources[:max_sources], start=1):
        citation = format_source_citation(source)
        if citation in seen or citation == "[NCERT]":
            continue
        seen.add(citation)
        source_file = _clean(source.get("source_file"))
        suffix = f" -- {source_file}" if source_file else ""
        lines.append(f"{index}. {citation}{suffix}")
    return "\n".join(lines)
