"""Corpus loading and the validated token / document-text conventions.

These helpers are the runtime equivalents of the functions that produced
Recall@10 = 0.5938 / 0.6250 / 0.6302. Changing tokenization or `document_text`
would change BM25 and BGE scores.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import numpy as np

TOKEN_RE = re.compile(
    r"[A-Za-z][A-Za-z0-9_'-]*|\d+(?:\.\d+)?|"
    r"[α-ωΑ-ΩπθλμσΩ∆]+|[+\-*/=<>^]+"
)


def normalize_text(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def tokens(text: str) -> list[str]:
    """Case-folded tokens used by BM25 and the Chemistry keyword gate."""
    return [item.casefold() for item in TOKEN_RE.findall(text)]


def document_text(record: dict[str, Any]) -> str:
    """Indexed text: chapter + section + chunk body."""
    return (
        f"Chapter: {normalize_text(record.get('chapter_name'))}\n"
        f"Section: {normalize_text(record.get('section_name'))}\n\n"
        f"{normalize_text(record.get('content'))}"
    )


def chunk_id(record: dict[str, Any]) -> str:
    return normalize_text(record.get("chunk_id"))


def read_jsonl(path: Path | str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    file_path = Path(path)
    with file_path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid JSONL at {file_path}:{line_no}: {exc}"
                ) from exc
    return records


def top_ids_from_scores(
    scores: np.ndarray,
    ids: list[str],
    top_k: int,
) -> list[str]:
    """Return ids for the highest scores, matching the validated ranking."""
    if len(scores) <= top_k:
        order = np.argsort(-scores)
    else:
        top = np.argpartition(-scores, top_k)[:top_k]
        order = top[np.argsort(-scores[top])]
    return [ids[int(idx)] for idx in order[:top_k]]


def l2_normalize(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms
