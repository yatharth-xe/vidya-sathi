"""Regression against the validated Chemistry-gated retrieval numbers.

Expected Recall@10 on the 192-query gold set:

    BM25                  0.5938
    Global BM25+BGE+RRF   0.6250
    Chemistry-Gated       0.6302
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import get_settings
from retrieval.bm25 import BM25Retriever
from retrieval.chemistry_gate import ChemistryKeywordGate
from retrieval.corpus import read_jsonl
from retrieval.hybrid import HybridRetriever
from tests.regression_metrics import recall_at_k
from vector_db.chroma_manager import ChromaDBManager

EXPECTED_BM25 = 0.5938
EXPECTED_HYBRID = 0.6250
EXPECTED_GATED = 0.6302
TOLERANCE = 0.01


class RetrievalRegressionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        settings = get_settings()
        queries = read_jsonl(settings.benchmark_queries_path)
        if len(queries) != 192:
            raise RuntimeError(
                f"Expected 192 benchmark queries, found {len(queries)}"
            )
        cls.queries = queries
        cls.bm25 = BM25Retriever(settings.knowledge_corpus_path)
        cls.hybrid = HybridRetriever(cls.bm25, ChromaDBManager())
        cls.gate = ChemistryKeywordGate()

        bm25_rankings: dict[str, list[str]] = {}
        hybrid_rankings: dict[str, list[str]] = {}
        gated_rankings: dict[str, list[str]] = {}

        for query in queries:
            text = query["query"]
            qid = query["query_id"]
            bm25_top = cls.bm25.ranking(text, 10)
            hybrid_top = [hit.chunk_id for hit in cls.hybrid.search(text, 10)]
            if cls.gate.decide(text).is_chemistry:
                gated = bm25_top
            else:
                gated = hybrid_top

            bm25_rankings[qid] = bm25_top
            hybrid_rankings[qid] = hybrid_top
            gated_rankings[qid] = gated

        cls.bm25_recall = recall_at_k(bm25_rankings, queries, 10)
        cls.hybrid_recall = recall_at_k(hybrid_rankings, queries, 10)
        cls.gated_recall = recall_at_k(gated_rankings, queries, 10)
        print(
            "\nRegression Recall@10 "
            f"BM25={cls.bm25_recall} Hybrid={cls.hybrid_recall} "
            f"Gated={cls.gated_recall}"
        )

    def test_bm25_recall(self) -> None:
        self.assertLessEqual(abs(self.bm25_recall - EXPECTED_BM25), TOLERANCE)

    def test_global_hybrid_recall(self) -> None:
        self.assertLessEqual(abs(self.hybrid_recall - EXPECTED_HYBRID), TOLERANCE)

    def test_chemistry_gated_recall(self) -> None:
        self.assertLessEqual(abs(self.gated_recall - EXPECTED_GATED), TOLERANCE)


if __name__ == "__main__":
    unittest.main()
