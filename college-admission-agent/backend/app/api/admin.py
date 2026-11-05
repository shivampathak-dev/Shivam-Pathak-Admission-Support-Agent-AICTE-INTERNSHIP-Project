"""
Admin API — PDF upload, re-indexing, document management, health check.
Admin role required for all write endpoints.
"""
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, require_admin
from app.core.config import get_settings
from app.models.database import IndexedDocument, User, get_db
from app.rag.granite_client import check_watsonx_health
from app.rag.ingestion import delete_document_chunks, get_collection_stats, ingest_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


# ── Background ingestion task ─────────────────────────────────────────────────

async def _run_ingestion(doc_id: int, file_path: str, filename: str):
    """Background task: ingest PDF and update DB record."""
    from app.models.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            chunk_count = ingest_pdf(file_path, filename)
            result = await db.execute(select(IndexedDocument).where(IndexedDocument.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "indexed"
                doc.chunk_count = chunk_count
                doc.indexed_at = datetime.now(timezone.utc)
                await db.commit()
        except Exception as exc:
            logger.error("Ingestion failed for %s: %s", filename, exc)
            result = await db.execute(select(IndexedDocument).where(IndexedDocument.id == doc_id))
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "error"
                doc.error_message = str(exc)
                await db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/documents/upload", status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF brochure and trigger async ingestion."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = Path(file.filename).name
    dest_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    with open(dest_path, "wb") as f:
        f.write(content)

    doc = IndexedDocument(
        filename=safe_name,
        file_path=dest_path,
        status="pending",
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(_run_ingestion, doc.id, dest_path, safe_name)

    return {
        "id": doc.id,
        "filename": safe_name,
        "status": "pending",
        "message": "File uploaded. Indexing started in background.",
    }


@router.get("/documents")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded documents (any authenticated user can view)."""
    result = await db.execute(
        select(IndexedDocument).order_by(IndexedDocument.uploaded_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "chunk_count": d.chunk_count,
            "status": d.status,
            "error_message": d.error_message,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "indexed_at": d.indexed_at.isoformat() if d.indexed_at else None,
        }
        for d in docs
    ]


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(IndexedDocument).where(IndexedDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove vector chunks
    deleted_count = delete_document_chunks(doc.filename)
    logger.info("Deleted %d chunks for %s", deleted_count, doc.filename)

    # Remove physical file
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    await db.commit()


@router.post("/documents/{doc_id}/reindex", status_code=202)
async def reindex_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(IndexedDocument).where(IndexedDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")

    # Remove old chunks first
    delete_document_chunks(doc.filename)
    doc.status = "pending"
    doc.chunk_count = 0
    doc.error_message = None
    await db.commit()

    background_tasks.add_task(_run_ingestion, doc.id, doc.file_path, doc.filename)
    return {"message": "Re-indexing started"}


@router.get("/stats")
async def system_stats(current_user: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Return collection stats + IBM Granite health."""
    collection_stats = get_collection_stats()
    granite_health = check_watsonx_health()

    # Total users
    from sqlalchemy import func
    from app.models.database import User as UserModel, ChatMessage, ChatSession
    user_count = (await db.execute(select(func.count(UserModel.id)))).scalar()
    msg_count = (await db.execute(select(func.count(ChatMessage.id)))).scalar()
    session_count = (await db.execute(select(func.count(ChatSession.id)))).scalar()

    return {
        "vector_store": collection_stats,
        "granite": granite_health,
        "usage": {
            "total_users": user_count,
            "total_sessions": session_count,
            "total_messages": msg_count,
        },
    }
