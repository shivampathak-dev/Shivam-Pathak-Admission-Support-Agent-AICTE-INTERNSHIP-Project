"""
Document ingestion pipeline:
  1. Parse PDF with PyMuPDF
  2. Chunk text (token-aware, with overlap)
  3. Embed with sentence-transformers
  4. Upsert into ChromaDB
"""
from __future__ import annotations  # defer annotation evaluation — required for Python 3.13 compat
import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
import json
import logging
import uuid
from pathlib import Path
from typing import Generator

import pymupdf as fitz  # PyMuPDF 2.x (replaces deprecated `import fitz`)
from sentence_transformers import SentenceTransformer

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Singleton clients ─────────────────────────────────────────────────────────

_chroma_client: chromadb.PersistentClient | None = None
_embedding_model: SentenceTransformer | None = None


def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        logger.info("ChromaDB client initialised at %s", settings.CHROMA_PERSIST_DIR)
    return _chroma_client


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info("Loading embedding model: %s", settings.EMBEDDING_MODEL_NAME)
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    return _embedding_model


def get_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# ── PDF parsing ───────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> list[dict]:
    """
    Returns list of {'page': int, 'text': str} dicts.
    """
    pages = []
    doc = fitz.open(file_path)
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        if text:
            pages.append({"page": page_num, "text": text})
    doc.close()
    return pages


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(
    text: str,
    chunk_size: int = None,
    overlap: int = None,
) -> Generator[str, None, None]:
    """
    Simple word-level chunker.  chunk_size / overlap are in approximate tokens
    (1 token ≈ 1 word for this purpose).
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    overlap = overlap or settings.CHUNK_OVERLAP
    words = text.split()
    start = 0
    while start < len(words):
        end = start + chunk_size
        yield " ".join(words[start:end])
        start += chunk_size - overlap


# ── Ingestion pipeline ────────────────────────────────────────────────────────

def ingest_pdf(file_path: str, filename: str) -> int:
    """
    Full pipeline: parse → chunk → embed → upsert.
    Returns number of chunks indexed.
    """
    logger.info("Starting ingestion for: %s", filename)
    pages = extract_text_from_pdf(file_path)

    collection = get_collection()
    model = get_embedding_model()

    chunks: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for page_data in pages:
        for chunk in chunk_text(page_data["text"]):
            chunk = chunk.strip()
            if len(chunk) < 30:          # skip near-empty chunks
                continue
            chunk_id = str(uuid.uuid4())
            chunks.append(chunk)
            metadatas.append({
                "filename": filename,
                "page": page_data["page"],
                "source": filename,
            })
            ids.append(chunk_id)

    if not chunks:
        logger.warning("No usable text found in %s", filename)
        return 0

    # Batch embedding (sentence-transformers handles internally)
    embeddings = model.encode(chunks, show_progress_bar=False).tolist()

    # Upsert in batches of 256 to stay within ChromaDB limits
    batch_size = 256
    for i in range(0, len(chunks), batch_size):
        collection.upsert(
            ids=ids[i : i + batch_size],
            documents=chunks[i : i + batch_size],
            embeddings=embeddings[i : i + batch_size],
            metadatas=metadatas[i : i + batch_size],
        )

    logger.info("Indexed %d chunks from %s", len(chunks), filename)
    return len(chunks)


def delete_document_chunks(filename: str) -> int:
    """Remove all chunks belonging to a specific filename."""
    collection = get_collection()
    results = collection.get(where={"filename": filename})
    ids_to_delete = results.get("ids", [])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)


# ── Retriever ─────────────────────────────────────────────────────────────────

def retrieve_relevant_chunks(query: str, top_k: int = None) -> list[dict]:
    """
    Embed the query and return the top-k most similar chunks with metadata.
    Returns list of {'content': str, 'source': str, 'page': int, 'score': float}.
    """
    top_k = top_k or settings.RETRIEVER_TOP_K
    collection = get_collection()

    # Guard: ChromaDB raises if collection is empty
    count = collection.count()
    if count == 0:
        logger.warning("ChromaDB collection is empty — no documents indexed yet.")
        return []

    model = get_embedding_model()
    query_embedding = model.encode([query], show_progress_bar=False).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, count),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for doc, meta, dist in zip(docs, metas, distances):
        chunks.append({
            "content": doc,
            "source": meta.get("filename", "unknown"),
            "page": meta.get("page", 0),
            "score": round(1 - dist, 4),   # cosine similarity
        })

    return chunks


def get_collection_stats() -> dict:
    """Return collection-level statistics."""
    try:
        collection = get_collection()
        total_chunks = collection.count()
        # aggregate by filename
        if total_chunks == 0:
            return {"total_chunks": 0, "documents": []}
        all_metas = collection.get(include=["metadatas"])["metadatas"]
        file_counts: dict[str, int] = {}
        for m in all_metas:
            fname = m.get("filename", "unknown")
            file_counts[fname] = file_counts.get(fname, 0) + 1
        return {
            "total_chunks": total_chunks,
            "documents": [
                {"filename": k, "chunks": v} for k, v in file_counts.items()
            ],
        }
    except Exception as exc:
        logger.error("Error fetching collection stats: %s", exc)
        return {"total_chunks": 0, "documents": [], "error": str(exc)}
