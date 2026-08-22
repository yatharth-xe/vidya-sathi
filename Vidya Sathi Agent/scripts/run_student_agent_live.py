"""Live Student Agent check. Requires Ollama Cloud credentials in the environment."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from agent.student_agent import run_student_agent
from agent.tools import STUDENT_AGENT_TOOLS


def main() -> int:
    names = [tool.name for tool in STUDENT_AGENT_TOOLS]
    print(f"Agent tools: {names}")
    expected = ["ncert_retriever", "student_learning_state", "scholarship_web_search"]
    if names != expected:
        print(
            "ERROR: expected exactly three tools: "
            "ncert_retriever, student_learning_state, scholarship_web_search"
        )
        return 1

    result = run_student_agent(
        "Explain electric field due to a point charge.",
        top_k=3,
    )
    print(f"Retriever called: {result.retriever_called}")
    print("Sources:")
    for source in result.retrieved_sources[:5]:
        print(
            f"- {source['subject']} | {source['chapter_name']} | "
            f"{source['section_name']} | {source['source_file']}"
        )
    print("\nFinal answer:\n")
    print(result.final_answer)
    return 0 if result.retriever_called and result.final_answer.strip() else 1


if __name__ == "__main__":
    raise SystemExit(main())
