"""Run representative retrieval queries and print routes + top hits."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from retrieval.retriever import retrieve

QUERIES = [
    ("Explain chemical bonding.", "bm25"),
    ("Explain the derivative of sin(x).", "bm25_bge_hybrid"),
    ("Explain electric field due to a point charge.", "bm25_bge_hybrid"),
]


def main() -> int:
    failed = 0
    for query, expected_route in QUERIES:
        payload = retrieve(query, top_k=3)
        ok = payload["route"] == expected_route
        failed += int(not ok)
        print("=" * 80)
        print(f"Query           : {query}")
        print(f"Expected route  : {expected_route}")
        print(f"Actual route    : {payload['route']}")
        print(f"Match           : {ok}")
        for row in payload["results"]:
            print(
                f"  [{row['rank']}] {row['subject']} | {row['chapter_name']} | "
                f"{row['section_name'] or '—'} | {row['source_file']}"
            )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
