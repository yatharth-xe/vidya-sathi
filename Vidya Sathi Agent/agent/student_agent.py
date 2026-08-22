"""Canonical NCERT Student Agent.

The agent reasons and answers. Its only tool is `ncert_retriever`.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any

from langchain.agents import create_agent
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_ollama import ChatOllama

from agent.citations import format_sources_block
from agent.prompts import STUDENT_AGENT_SYSTEM_PROMPT
from agent.tools import STUDENT_AGENT_TOOLS
from config.settings import get_settings


@dataclass(frozen=True)
class StudentAgentRun:
    query: str
    final_answer: str
    retriever_called: bool
    retrieved_sources: list[dict[str, Any]]
    messages: list[BaseMessage]
    route: str = ""
    sources_block: str = ""


def _load_model(model: str | BaseChatModel | None = None) -> BaseChatModel:
    if isinstance(model, BaseChatModel):
        return model

    settings = get_settings()
    model_name = model or settings.ollama_model
    # ChatOllama/ollama.Client read OLLAMA_API_KEY from the environment.
    return ChatOllama(
        model=model_name,
        base_url=settings.ollama_base_url,
        temperature=0.1,
        validate_model_on_init=False,
    )


def create_student_agent(model: str | BaseChatModel | None = None) -> Any:
    """Create the agent with only the NCERT Retriever Tool."""
    return create_agent(
        model=_load_model(model),
        tools=STUDENT_AGENT_TOOLS,
        system_prompt=STUDENT_AGENT_SYSTEM_PROMPT,
    )


def _message_text(message: BaseMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    return json.dumps(content, ensure_ascii=False)


def _parse_tool_payload(message: ToolMessage) -> dict[str, Any]:
    content = message.content
    if isinstance(content, dict):
        return content
    if isinstance(content, str):
        try:
            payload = json.loads(content)
            return payload if isinstance(payload, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _source_summary(payload: dict[str, Any]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for item in payload.get("results", []):
        sources.append(
            {
                "rank": item.get("rank"),
                "chunk_id": item.get("chunk_id"),
                "score": item.get("score"),
                "subject": item.get("subject"),
                "chapter_name": item.get("chapter_name"),
                "section_name": item.get("section_name"),
                "page_start": item.get("page_start"),
                "page_end": item.get("page_end"),
                "source_file": item.get("source_file"),
            }
        )
    return sources


def run_student_agent(
    query: str,
    *,
    top_k: int | None = None,
    model: str | BaseChatModel | None = None,
) -> StudentAgentRun:
    """Run the Student Agent on one question."""
    settings = get_settings()
    selected_top_k = settings.default_top_k if top_k is None else top_k

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    if not isinstance(selected_top_k, int) or selected_top_k < 1:
        raise ValueError("top_k must be a positive integer")

    agent = create_student_agent(model=model)
    user_content = (
        f"Student question: {query.strip()}\n"
        f"If you use ncert_retriever, set top_k={selected_top_k}."
    )
    state = agent.invoke({"messages": [{"role": "user", "content": user_content}]})
    messages = list(state.get("messages", []))

    tool_messages = [
        message
        for message in messages
        if isinstance(message, ToolMessage) and message.name == "ncert_retriever"
    ]
    retrieved_sources: list[dict[str, Any]] = []
    for message in tool_messages:
        retrieved_sources.extend(_source_summary(_parse_tool_payload(message)))

    final_answer = ""
    for message in reversed(messages):
        if isinstance(message, AIMessage) and not message.tool_calls:
            final_answer = _message_text(message)
            break

    # Sources appendix built ONLY from real retriever metadata (never invented).
    sources_block = format_sources_block(retrieved_sources)
    route = ""
    for message in tool_messages:
        payload = _parse_tool_payload(message)
        if payload.get("route"):
            route = str(payload["route"])
            break

    return StudentAgentRun(
        query=query,
        final_answer=final_answer,
        retriever_called=bool(tool_messages),
        retrieved_sources=retrieved_sources,
        messages=messages,
        route=route,
        sources_block=sources_block,
    )


def ask_student_agent(query: str, top_k: int | None = None) -> str:
    return run_student_agent(query, top_k=top_k).final_answer


def main() -> None:
    # Windows consoles default to cp1252 and crash on characters like U+2011
    # that models emit. Force UTF-8 with safe fallbacks.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    settings = get_settings()
    parser = argparse.ArgumentParser(description="Ask Vidya Sathi, the NCERT Student Agent.")
    parser.add_argument("query", nargs="?", help="Student question.")
    parser.add_argument("--top-k", type=int, default=settings.default_top_k)
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    query = args.query or input("Student question: ").strip()
    if not query:
        raise SystemExit("A non-empty query is required.")

    result = run_student_agent(query, top_k=args.top_k, model=args.model)

    print("\n" + "=" * 80)
    print("VIDYA SATHI — STUDENT AGENT")
    print("=" * 80)
    print(f"Query: {result.query}")
    print(f"Retriever Tool called: {result.retriever_called}")
    print(f"Route: {result.route or 'n/a'}")
    print("\nFINAL ANSWER")
    print("-" * 80)
    print(result.final_answer)
    if result.sources_block:
        print("\nSOURCES (from retrieved metadata)")
        print("-" * 80)
        print(result.sources_block)
    print("\nRETRIEVED SOURCES")
    print("-" * 80)
    if not result.retrieved_sources:
        print("No retriever sources returned.")
    else:
        for source in result.retrieved_sources:
            print(
                f"[{source['rank']}] "
                f"{source.get('subject')} | "
                f"{source.get('chapter_name')} | "
                f"{source.get('section_name')} | "
                f"pages {source.get('page_start')}-{source.get('page_end')} | "
                f"{source.get('source_file')}"
            )


if __name__ == "__main__":
    main()
