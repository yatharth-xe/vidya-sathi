"""Persistent ChromaDB for NCERT knowledge chunks."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb
import numpy as np
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from config.settings import COLLECTION_METADATA, get_settings


class ChromaDBError(RuntimeError):
    """Raised when local ChromaDB setup or validation fails."""


@dataclass(frozen=True)
class ChromaStatus:
    persist_directory: str
    collection_name: str
    collection_count: int
    collection_metadata: dict[str, Any]
    chromadb_version: str


class ChromaDBManager:
    """Load the persistent `ncert_knowledge` collection."""

    def __init__(
        self,
        persist_directory: Path | str | None = None,
        collection_name: str | None = None,
        collection_metadata: dict[str, Any] | None = None,
    ) -> None:
        settings = get_settings()
        self.persist_directory = Path(
            persist_directory or settings.chroma_persist_directory
        )
        self.collection_name = collection_name or settings.collection_name
        self.collection_metadata = dict(
            collection_metadata or COLLECTION_METADATA
        )
        self._client: ClientAPI | None = None
        self._collection: Collection | None = None

    def initialize_client(self) -> ClientAPI:
        try:
            if not self.persist_directory.exists():
                raise ChromaDBError(
                    f"Chroma persist directory does not exist: {self.persist_directory}"
                )
            self._client = chromadb.PersistentClient(path=str(self.persist_directory))
            return self._client
        except ChromaDBError:
            raise
        except Exception as exc:
            raise ChromaDBError(
                f"Failed to initialize ChromaDB at {self.persist_directory}: {exc}"
            ) from exc

    @property
    def client(self) -> ClientAPI:
        if self._client is None:
            return self.initialize_client()
        return self._client

    def get_collection(self) -> Collection:
        try:
            collection = self.client.get_collection(
                name=self.collection_name,
                embedding_function=None,
            )
            self._collection = collection
            return collection
        except Exception as exc:
            raise ChromaDBError(
                f"Failed to load collection {self.collection_name!r}: {exc}"
            ) from exc

    @property
    def collection(self) -> Collection:
        if self._collection is None:
            return self.get_collection()
        return self._collection

    def get_collection_count(self) -> int:
        try:
            return int(self.collection.count())
        except Exception as exc:
            raise ChromaDBError(
                f"Failed to read count for {self.collection_name!r}: {exc}"
            ) from exc

    def get_collection_metadata(self) -> dict[str, Any]:
        try:
            return dict(self.collection.metadata or {})
        except Exception as exc:
            raise ChromaDBError(
                f"Failed to inspect metadata for {self.collection_name!r}: {exc}"
            ) from exc

    def load_embeddings(self) -> tuple[list[str], np.ndarray]:
        """Load every stored BGE vector for exact cosine search."""
        try:
            payload = self.collection.get(include=["embeddings"])
        except Exception as exc:
            raise ChromaDBError(
                f"Failed to load embeddings from {self.collection_name!r}: {exc}"
            ) from exc

        ids = list(payload.get("ids") or [])
        embeddings = payload.get("embeddings")
        if embeddings is None or len(ids) == 0:
            raise ChromaDBError(
                f"Collection {self.collection_name!r} has no stored embeddings."
            )
        matrix = np.asarray(embeddings, dtype=np.float32)
        if matrix.ndim != 2:
            raise ChromaDBError(
                f"Unexpected embedding matrix shape {matrix.shape} for "
                f"{self.collection_name!r}."
            )
        return ids, matrix

    def health_check(self, expected_count: int | None = None) -> ChromaStatus:
        settings = get_settings()
        expected = (
            settings.expected_chunk_count
            if expected_count is None
            else expected_count
        )
        metadata = self.get_collection_metadata()
        count = self.get_collection_count()
        if count != expected:
            raise ChromaDBError(
                f"Expected Chroma count {expected}, got {count}."
            )
        return ChromaStatus(
            persist_directory=str(self.persist_directory),
            collection_name=self.collection_name,
            collection_count=count,
            collection_metadata=metadata,
            chromadb_version=chromadb.__version__,
        )
