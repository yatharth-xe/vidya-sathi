"""BM25 + BGE hybrid retrieval with Reciprocal Rank Fusion.

Dense search is exact cosine over the persisted Chroma embeddings
(BAAI/bge-small-en-v1.5), not a separate ANN ranking. That matches the
validated benchmark, which scored BGE against the full 2587-chunk matrix.
"""

from __future__ import annotations

from dataclasses import dataclass

from config.settings import get_settings
from retrieval.bm25 import BM25Retriever
from retrieval.corpus import top_ids_from_scores
from retrieval.rrf import reciprocal_rank_fusion
from vector_db.chroma_manager import ChromaDBManager
from vector_db.embeddings import encode_texts


@dataclass(frozen=True)
class HybridHit:
    chunk_id: str
    score: float


class HybridRetriever:
    """Fuse BM25 candidates with BGE candidates via RRF."""

    def __init__(
        self,
        bm25: BM25Retriever,
        chroma: ChromaDBManager | None = None,
        *,
        candidate_k: int | None = None,
        rrf_k: int | None = None,
    ) -> None:
        settings = get_settings()
        self.bm25 = bm25
        self.chroma = chroma or ChromaDBManager()
        self.candidate_k = candidate_k or settings.candidate_k
        self.rrf_k = rrf_k or settings.rrf_k
        self.bge_model = settings.bge_model
        self.dense_ids, self.dense_matrix = self.chroma.load_embeddings()

    def dense_ranking(self, query: str, candidate_k: int) -> list[str]:
        query_embedding = encode_texts([query], self.bge_model)[0]
        scores = self.dense_matrix @ query_embedding
        return top_ids_from_scores(scores, self.dense_ids, candidate_k)

    def search(self, query: str, top_k: int = 10) -> list[HybridHit]:
        candidate_k = max(top_k, self.candidate_k)
        bm25_ranking = self.bm25.ranking(query, candidate_k)
        dense_ranking = self.dense_ranking(query, candidate_k)
        fused = reciprocal_rank_fusion(
            [bm25_ranking, dense_ranking],
            rrf_k=self.rrf_k,
            top_k=top_k,
        )
        return [HybridHit(chunk_id=cid, score=score) for cid, score in fused]
