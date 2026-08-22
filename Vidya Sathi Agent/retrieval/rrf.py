"""Reciprocal Rank Fusion used by hybrid retrieval.

    score(id) = sum_i  1 / (rrf_k + rank_i)

Default rrf_k = 60, matching the validated hybrid.
"""

from __future__ import annotations

from collections import Counter


def reciprocal_rank_fusion(
    rankings: list[list[str]],
    *,
    rrf_k: int,
    top_k: int,
) -> list[tuple[str, float]]:
    """Fuse ranked id lists and return `(chunk_id, rrf_score)` descending."""
    scores: Counter[str] = Counter()
    for ranking in rankings:
        for rank, cid in enumerate(ranking, start=1):
            scores[cid] += 1.0 / (rrf_k + rank)
    return [(cid, float(score)) for cid, score in scores.most_common(top_k)]
