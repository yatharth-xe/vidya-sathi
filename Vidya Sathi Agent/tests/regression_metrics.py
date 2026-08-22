"""Recall@K helpers for retrieval regression tests."""

from __future__ import annotations

from typing import Any


def recall_at_k(
    rankings: dict[str, list[str]],
    queries: list[dict[str, Any]],
    k: int = 10,
) -> float:
    hits = 0
    for query in queries:
        relevant = set(query["relevant_chunk_ids"])
        ranked = rankings.get(query["query_id"], [])[:k]
        if any(cid in relevant for cid in ranked):
            hits += 1
    return round(hits / len(queries), 4) if queries else 0.0
