from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from agent.student_agent import run_student_agent
from agent.tools import STUDENT_AGENT_TOOLS, ncert_retriever


class ScriptedRetrieverModel(BaseChatModel):
    """Deterministic model that calls ncert_retriever once, then answers."""

    @property
    def _llm_type(self) -> str:
        return "scripted-retriever"

    def bind_tools(self, tools, **kwargs):  # type: ignore[no-untyped-def]
        return self

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager=None,
        **kwargs,
    ) -> ChatResult:
        has_tool_result = any(isinstance(message, ToolMessage) for message in messages)
        if not has_tool_result:
            message = AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "ncert_retriever",
                        "args": {
                            "query": "Explain chemical bonding.",
                            "top_k": 1,
                        },
                        "id": "call_retriever",
                        "type": "tool_call",
                    }
                ],
            )
        else:
            message = AIMessage(
                content=(
                    "Chemical bonding is the attractive force that holds atoms "
                    "together in a molecule. Source: Chemical Bonding and "
                    "Molecular Structure, NCERT."
                )
            )
        return ChatResult(generations=[ChatGeneration(message=message)])


class StudentAgentTest(unittest.TestCase):
    def test_agent_exposes_only_retriever_tool(self) -> None:
        self.assertEqual(len(STUDENT_AGENT_TOOLS), 1)
        self.assertEqual(STUDENT_AGENT_TOOLS[0].name, "ncert_retriever")

    def test_tool_arguments_are_passed_correctly(self) -> None:
        captured: dict[str, object] = {}

        def fake_retrieve(query: str, top_k: int = 10) -> dict:
            captured["query"] = query
            captured["top_k"] = top_k
            return {"query": query, "route": "bm25", "results": []}

        with patch("agent.tools.retrieve_ncert_knowledge", fake_retrieve):
            ncert_retriever.invoke(
                {"query": "Explain chemical bonding.", "top_k": 4}
            )

        self.assertEqual(captured["query"], "Explain chemical bonding.")
        self.assertEqual(captured["top_k"], 4)

    def test_student_agent_calls_retriever_and_answers(self) -> None:
        result = run_student_agent(
            "Explain chemical bonding.",
            top_k=1,
            model=ScriptedRetrieverModel(),
        )
        self.assertTrue(result.retriever_called)
        self.assertTrue(result.retrieved_sources)
        self.assertTrue(result.final_answer)
        self.assertIn("bonding", result.final_answer.lower())

    def test_empty_query_fails_cleanly(self) -> None:
        with self.assertRaisesRegex(ValueError, "query must be a non-empty string"):
            run_student_agent("")

    @unittest.skipUnless(
        os.getenv("RUN_LIVE_AGENT_TESTS") == "1",
        "Set RUN_LIVE_AGENT_TESTS=1 to call Ollama Cloud.",
    )
    def test_ollama_cloud_student_agent(self) -> None:
        result = run_student_agent("Explain chemical bonding.", top_k=2)
        self.assertTrue(result.retriever_called)
        self.assertTrue(result.final_answer.strip())


if __name__ == "__main__":
    unittest.main()
