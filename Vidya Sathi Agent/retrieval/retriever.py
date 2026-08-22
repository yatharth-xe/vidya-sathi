"""Public retriever used by the Student Agent.

The agent calls `retrieve(query, top_k)`. Routing, BM25, BGE, RRF, and
Chroma stay behind this function.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from config.settings import get_settings
from retrieval.bm25 import BM25Hit, BM25Retriever
from retrieval.chemistry_gate import ChemistryKeywordGate
from retrieval.hybrid import HybridHit, HybridRetriever
from vector_db.chroma_manager import ChromaDBManager

METADATA_FIELDS = (
    "subject",
    "chapter_name",
    "section_name",
    "page_start",
    "page_end",
    "source_file",
)


@lru_cache(maxsize=1)
def _bm25(corpus_path: str) -> BM25Retriever:
    return BM25Retriever(corpus_path)


@lru_cache(maxsize=1)
def _gate() -> ChemistryKeywordGate:
    return ChemistryKeywordGate()


@lru_cache(maxsize=1)
def _hybrid(corpus_path: str) -> HybridRetriever:
    return HybridRetriever(_bm25(corpus_path), ChromaDBManager())


def _validate(query: str, top_k: int) -> None:
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    if not isinstance(top_k, int) or top_k < 1:
        raise ValueError("top_k must be a positive integer")


def _format_hit(
    rank: int,
    hit: BM25Hit | HybridHit,
    record: dict[str, Any],
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "rank": rank,
        "chunk_id": hit.chunk_id,
        "score": hit.score,
        "content": record.get("content", ""),
    }
    for field in METADATA_FIELDS:
        payload[field] = record.get(field)
    return payload


def retrieve(
    query: str,
    top_k: int | None = None,
    *,
    corpus_path: Path | str | None = None,
) -> dict[str, Any]:
    """Return ranked NCERT chunks. Does not generate an answer."""
    settings = get_settings()
    selected_top_k = settings.default_top_k if top_k is None else top_k
    _validate(query, selected_top_k)

    corpus_key = str(Path(corpus_path or settings.knowledge_corpus_path))
    bm25 = _bm25(corpus_key)
    decision = _gate().decide(query)

    if decision.is_chemistry:
        route = "bm25"
        hits: list[BM25Hit | HybridHit] = list(bm25.search(query, selected_top_k))
    else:
        route = "bm25_bge_hybrid"
        hits = list(_hybrid(corpus_key).search(query, selected_top_k))

    return {
        "query": query,
        "route": route,
        "top_k": selected_top_k,
        "gate": {
            "is_chemistry": decision.is_chemistry,
            "score": decision.score,
            "confidence": decision.confidence,
            "reason": decision.reason,
            "matched_phrases": decision.matched_phrases,
            "matched_strong_terms": decision.matched_strong_terms,
            "matched_medium_terms": decision.matched_medium_terms,
        },
        "results": [
            _format_hit(rank, hit, bm25.get_record(hit.chunk_id))
            for rank, hit in enumerate(hits, start=1)
        ],
    }
