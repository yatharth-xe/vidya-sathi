"""Retrieve NCERT chunks without calling the Student Agent."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from retrieval.retriever import retrieve

QUERIES = [
    "Explain chemical bonding.",
    "Explain the derivative of sin(x).",
    "Explain electric field due to a point charge.",
]


def main() -> int:
    for query in QUERIES:
        payload = retrieve(query, top_k=3)
        print("=" * 80)
        print(json.dumps(
            {
                "query": payload["query"],
                "route": payload["route"],
                "results": [
                    {
                        "rank": row["rank"],
                        "chunk_id": row["chunk_id"],
                        "subject": row["subject"],
                        "chapter_name": row["chapter_name"],
                        "section_name": row["section_name"],
                        "page_start": row["page_start"],
                        "page_end": row["page_end"],
                        "source_file": row["source_file"],
                    }
                    for row in payload["results"]
                ],
            },
            ensure_ascii=False,
            indent=2,
        ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
