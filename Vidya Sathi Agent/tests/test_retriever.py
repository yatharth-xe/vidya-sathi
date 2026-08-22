from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import EXPECTED_CHUNK_COUNT
from retrieval.retriever import retrieve
from vector_db.chroma_manager import ChromaDBManager


class RetrieverToolTest(unittest.TestCase):
    def test_chemistry_query_routes_to_bm25(self) -> None:
        result = retrieve("Explain chemical bonding.", top_k=3)
        self.assertEqual(result["route"], "bm25")
        self.assertEqual(len(result["results"]), 3)
        self.assertTrue(result["results"][0]["content"])

    def test_mathematics_query_routes_to_hybrid(self) -> None:
        result = retrieve("Explain the derivative of sin(x).", top_k=3)
        self.assertEqual(result["route"], "bm25_bge_hybrid")
        self.assertEqual(len(result["results"]), 3)
        self.assertTrue(result["results"][0]["content"])

    def test_physics_query_routes_to_hybrid(self) -> None:
        result = retrieve("Explain electric field due to a point charge.", top_k=3)
        self.assertEqual(result["route"], "bm25_bge_hybrid")
        self.assertEqual(len(result["results"]), 3)
        self.assertTrue(result["results"][0]["content"])

    def test_metadata_preservation(self) -> None:
        result = retrieve("Explain chemical bonding.", top_k=1)
        row = result["results"][0]
        for key in (
            "chunk_id",
            "score",
            "content",
            "subject",
            "chapter_name",
            "section_name",
            "page_start",
            "page_end",
            "source_file",
        ):
            self.assertIn(key, row)
        self.assertTrue(row["chunk_id"])
        self.assertTrue(row["source_file"])

    def test_chroma_collection_has_expected_count(self) -> None:
        self.assertEqual(
            ChromaDBManager().get_collection_count(),
            EXPECTED_CHUNK_COUNT,
        )

    def test_empty_query_fails_cleanly(self) -> None:
        with self.assertRaisesRegex(ValueError, "query must be a non-empty string"):
            retrieve("", top_k=10)
        with self.assertRaisesRegex(ValueError, "query must be a non-empty string"):
            retrieve("   ", top_k=10)

    def test_invalid_top_k_fails_cleanly(self) -> None:
        with self.assertRaisesRegex(ValueError, "top_k must be a positive integer"):
            retrieve("Explain chemical bonding.", top_k=0)


if __name__ == "__main__":
    unittest.main()
