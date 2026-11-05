"""
ingest_knowledge_base.py — Seed ChromaDB with markdown knowledge base files.
Run once: python3 ingest_knowledge_base.py
"""
import os
import sys
import asyncio
from pathlib import Path

# Must run from backend/ directory
sys.path.insert(0, str(Path(__file__).parent))

# Load .env
from dotenv import load_dotenv
load_dotenv()

KB_DIR = Path(__file__).parent / "data" / "knowledge_base"

def ingest_markdown(file_path: Path) -> int:
    """Parse a markdown file, chunk it, embed it, upsert into ChromaDB."""
    from app.rag.ingestion import (
        get_collection, get_embedding_model,
        chunk_text
    )
    import uuid

    text = file_path.read_text(encoding="utf-8")
    filename = file_path.name

    collection = get_collection()
    model = get_embedding_model()

    chunks_list = []
    metadatas = []
    ids = []

    # Use line-based pseudo-pages (every 80 lines = 1 "page")
    lines = text.splitlines()
    page_size = 80
    pages = ["\n".join(lines[i:i+page_size]) for i in range(0, len(lines), page_size)]

    for page_num, page_text in enumerate(pages, start=1):
        for chunk in chunk_text(page_text):
            chunk = chunk.strip()
            if len(chunk) < 30:
                continue
            chunks_list.append(chunk)
            metadatas.append({
                "filename": filename,
                "page": page_num,
                "source": filename,
            })
            ids.append(str(uuid.uuid4()))

    if not chunks_list:
        print(f"  ⚠  No usable chunks in {filename}")
        return 0

    embeddings = model.encode(chunks_list, show_progress_bar=False).tolist()

    batch_size = 256
    for i in range(0, len(chunks_list), batch_size):
        collection.upsert(
            ids=ids[i:i+batch_size],
            documents=chunks_list[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
        )

    return len(chunks_list)


def main():
    if not KB_DIR.exists():
        print(f"Knowledge base directory not found: {KB_DIR}")
        sys.exit(1)

    md_files = sorted(KB_DIR.glob("*.md"))
    if not md_files:
        print("No .md files found in", KB_DIR)
        sys.exit(1)

    print(f"\n📚 Ingesting {len(md_files)} knowledge base files into ChromaDB...\n")

    total_chunks = 0
    for md_file in md_files:
        print(f"  ▶  {md_file.name} ", end="", flush=True)
        count = ingest_markdown(md_file)
        print(f"→ {count} chunks indexed ✅")
        total_chunks += count

    print(f"\n✅ Done! Total chunks indexed: {total_chunks}")
    print("   ChromaDB is ready for RAG queries.\n")


if __name__ == "__main__":
    main()
