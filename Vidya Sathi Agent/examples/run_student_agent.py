"""Minimal Student Agent integration example."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from agent.student_agent import run_student_agent


def main() -> int:
    query = "Explain the derivative of sin(x)."
    result = run_student_agent(query, top_k=3)
    print(f"Query: {result.query}")
    print(f"Retriever called: {result.retriever_called}")
    print("Sources:")
    for source in result.retrieved_sources[:3]:
        print(
            f"- {source['subject']} | {source['chapter_name']} | "
            f"{source['section_name']} | pages {source['page_start']}-{source['page_end']}"
        )
    print("\nAnswer:\n")
    print(result.final_answer)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
