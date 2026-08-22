"""Query-time BGE encoding. Document embeddings live in Chroma."""

from __future__ import annotations

from functools import lru_cache

import numpy as np

from config.settings import get_settings
from retrieval.corpus import l2_normalize


def get_compute_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        return "cpu"
    except Exception:
        return "cpu"


@lru_cache(maxsize=1)
def _load_model(model_name: str, cache_dir: str, device: str):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        model_name,
        cache_folder=cache_dir,
        device=device,
    )


def encode_texts(
    texts: list[str],
    model_name: str | None = None,
    *,
    device: str | None = None,
    batch_size: int | None = None,
) -> np.ndarray:
    """Encode texts with BGE using the same normalization as ingest."""
    settings = get_settings()
    selected_model = model_name or settings.bge_model
    selected_device = device or get_compute_device()
    cache_dir = settings.model_cache_dir / "sentence_transformers"
    cache_dir.mkdir(parents=True, exist_ok=True)

    model = _load_model(selected_model, str(cache_dir), selected_device)
    selected_batch_size = batch_size or (64 if selected_device == "cuda" else 32)
    embeddings = model.encode(
        texts,
        batch_size=selected_batch_size,
        show_progress_bar=len(texts) > selected_batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)
    return l2_normalize(embeddings).astype(np.float32)
