"""Runtime configuration loaded from the environment.

Secrets are never stored in this module. `OLLAMA_API_KEY` is read from the
environment at process start and is not written to disk.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / ".env")

DEFAULT_CORPUS_PATH = PROJECT_ROOT / "data" / "knowledge_chunks_final.jsonl"
DEFAULT_CHROMA_DIR = PROJECT_ROOT / "data" / "chroma_db"
DEFAULT_BENCHMARK_QUERIES = (
    PROJECT_ROOT / "data" / "benchmark" / "embedding_queries.jsonl"
)
DEFAULT_MODEL_CACHE = PROJECT_ROOT / "data" / "model_cache"

COLLECTION_NAME = "ncert_knowledge"
COLLECTION_METADATA = {
    "description": "NCERT textbook knowledge chunks for RAG",
    "version": "v1",
}

BGE_MODEL_NAME = "BAAI/bge-small-en-v1.5"
EXPECTED_CHUNK_COUNT = 2587

BM25_K1 = 1.5
BM25_B = 0.75
DEFAULT_CANDIDATE_K = 50
DEFAULT_RRF_K = 60
DEFAULT_TOP_K = 10

DEFAULT_AGENT_MODEL = "gpt-oss:120b-cloud"
DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name)
    if not raw:
        return default
    path = Path(raw)
    return path if path.is_absolute() else PROJECT_ROOT / path


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if not raw:
        return default
    return int(raw)


@dataclass(frozen=True)
class Settings:
    """All runtime knobs used by retrieval, Chroma, and the Student Agent."""

    project_root: Path
    knowledge_corpus_path: Path
    chroma_persist_directory: Path
    collection_name: str
    bge_model: str
    model_cache_dir: Path
    candidate_k: int
    rrf_k: int
    default_top_k: int
    bm25_k1: float
    bm25_b: float
    expected_chunk_count: int
    ollama_model: str
    ollama_base_url: str
    benchmark_queries_path: Path

    @property
    def ollama_api_key(self) -> str | None:
        """Return the API key from the environment without storing it here."""
        key = os.getenv("OLLAMA_API_KEY", "").strip()
        return key or None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load settings once per process."""
    return Settings(
        project_root=PROJECT_ROOT,
        knowledge_corpus_path=_env_path(
            "VIDYA_SATHI_CORPUS_PATH",
            DEFAULT_CORPUS_PATH,
        ),
        chroma_persist_directory=_env_path(
            "VIDYA_SATHI_CHROMA_DIR",
            DEFAULT_CHROMA_DIR,
        ),
        collection_name=os.getenv(
            "VIDYA_SATHI_COLLECTION_NAME",
            COLLECTION_NAME,
        ),
        bge_model=os.getenv("VIDYA_SATHI_BGE_MODEL", BGE_MODEL_NAME),
        model_cache_dir=_env_path(
            "VIDYA_SATHI_MODEL_CACHE",
            DEFAULT_MODEL_CACHE,
        ),
        candidate_k=_env_int("VIDYA_SATHI_CANDIDATE_K", DEFAULT_CANDIDATE_K),
        rrf_k=_env_int("VIDYA_SATHI_RRF_K", DEFAULT_RRF_K),
        default_top_k=_env_int("VIDYA_SATHI_TOP_K", DEFAULT_TOP_K),
        bm25_k1=BM25_K1,
        bm25_b=BM25_B,
        expected_chunk_count=EXPECTED_CHUNK_COUNT,
        ollama_model=os.getenv(
            "VIDYA_SATHI_MODEL",
            os.getenv("NCERT_STUDENT_AGENT_MODEL", DEFAULT_AGENT_MODEL),
        ),
        ollama_base_url=os.getenv(
            "OLLAMA_BASE_URL",
            os.getenv("OLLAMA_HOST", DEFAULT_OLLAMA_BASE_URL),
        ),
        benchmark_queries_path=DEFAULT_BENCHMARK_QUERIES,
    )
