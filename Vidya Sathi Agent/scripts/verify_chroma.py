"""Verify the persistent Chroma collection has 2587 NCERT chunks."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config.settings import get_settings
from vector_db.chroma_manager import ChromaDBManager


def main() -> int:
    settings = get_settings()
    manager = ChromaDBManager()
    status = manager.health_check()
    print(f"persist_directory : {status.persist_directory}")
    print(f"collection_name   : {status.collection_name}")
    print(f"collection_count  : {status.collection_count}")
    print(f"expected_count    : {settings.expected_chunk_count}")
    print(f"chromadb_version  : {status.chromadb_version}")
    print(f"metadata          : {status.collection_metadata}")
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
