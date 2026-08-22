"""In-memory BM25 over the final NCERT knowledge chunks.

Scoring matches the validated implementation:

    k1 = 1.5
    b  = 0.75
    idf(term) = log(1 + (N - df + 0.5) / (df + 0.5))
"""

from __future__ import annotations

import math
import statistics
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from config.settings import get_settings
from retrieval.corpus import chunk_id, document_text, read_jsonl, tokens, top_ids_from_scores


@dataclass(frozen=True)
class BM25Hit:
    chunk_id: str
    score: float


def build_bm25(
    documents: list[str],
) -> tuple[list[list[str]], list[Counter[str]], dict[str, float], float]:
    """Tokenize the corpus and build IDF / average document length."""
    doc_tokens = [tokens(document) for document in documents]
    n_docs = len(doc_tokens)
    df: Counter[str] = Counter()
    for doc in doc_tokens:
        df.update(set(doc))

    idf = {
        term: math.log(1 + (n_docs - freq + 0.5) / (freq + 0.5))
        for term, freq in df.items()
    }
    avgdl = statistics.mean(len(doc) for doc in doc_tokens) if doc_tokens else 1.0
    doc_counts = [Counter(doc) for doc in doc_tokens]
    return doc_tokens, doc_counts, idf, avgdl


def bm25_scores(
    doc_tokens: list[list[str]],
    doc_counts: list[Counter[str]],
    query_tokens: list[str],
    idf: dict[str, float],
    avgdl: float,
    *,
    k1: float,
    b: float,
) -> np.ndarray:
    """Score every document for one query."""
    scores = np.zeros(len(doc_tokens), dtype=np.float32)
    query_counts = Counter(query_tokens)

    for term, qtf in query_counts.items():
        if term not in idf:
            continue
        term_idf = idf[term]
        for idx, doc in enumerate(doc_tokens):
            tf = doc_counts[idx].get(term, 0)
            if not tf:
                continue
            denom = tf + k1 * (1 - b + b * len(doc) / avgdl)
            scores[idx] += term_idf * (tf * (k1 + 1) / denom) * qtf
    return scores


class BM25Retriever:
    """BM25 index over `knowledge_chunks_final.jsonl`."""

    def __init__(self, corpus_path: Path | str | None = None) -> None:
        settings = get_settings()
        self.corpus_path = Path(corpus_path or settings.knowledge_corpus_path)
        self.k1 = settings.bm25_k1
        self.b = settings.bm25_b
        self.records = read_jsonl(self.corpus_path)
        self.ids = [chunk_id(record) for record in self.records]
        self.documents = [document_text(record) for record in self.records]
        self.records_by_id = dict(zip(self.ids, self.records, strict=True))
        self.index_by_id = {cid: index for index, cid in enumerate(self.ids)}
        (
            self.doc_tokens,
            self.doc_counts,
            self.idf,
            self.avgdl,
        ) = build_bm25(self.documents)

    def score(self, query: str) -> np.ndarray:
        return bm25_scores(
            self.doc_tokens,
            self.doc_counts,
            tokens(query),
            self.idf,
            self.avgdl,
            k1=self.k1,
            b=self.b,
        )

    def search(self, query: str, top_k: int = 10) -> list[BM25Hit]:
        scores = self.score(query)
        ranked_ids = top_ids_from_scores(scores, self.ids, top_k)
        return [
            BM25Hit(chunk_id=cid, score=float(scores[self.index_by_id[cid]]))
            for cid in ranked_ids
        ]

    def ranking(self, query: str, top_k: int) -> list[str]:
        return [hit.chunk_id for hit in self.search(query, top_k)]

    def get_record(self, cid: str) -> dict[str, Any]:
        return self.records_by_id[cid]
