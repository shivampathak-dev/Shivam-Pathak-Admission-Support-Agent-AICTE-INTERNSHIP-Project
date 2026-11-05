"""
Chat API — sessions, streaming answers, history.
"""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.models.database import ChatMessage, ChatSession, User, get_db
from app.rag.granite_client import generate_answer, stream_answer
from app.rag.ingestion import retrieve_relevant_chunks

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    message: str
    session_id: int | None = None
    stream: bool = False


class SessionCreateRequest(BaseModel):
    title: str = "New Conversation"


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/sessions", status_code=201)
async def create_session(
    body: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=body.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    messages = msgs.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources or "[]"),
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


# ── Query (non-streaming) ─────────────────────────────────────────────────────

@router.post("/query")
async def query(
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure session exists
    if body.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        # Auto-create session with first 60 chars of message as title
        title = body.message[:60] + ("…" if len(body.message) > 60 else "")
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        await db.flush()

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)

    # RAG pipeline
    chunks = retrieve_relevant_chunks(body.message)
    answer, sources = await generate_answer(body.message, chunks)

    # Save assistant message
    ai_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources),
    )
    db.add(ai_msg)

    # Update session timestamp + title if new
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "session_id": session.id,
        "answer": answer,
        "sources": sources,
        "message_id": ai_msg.id,
    }


# ── Streaming query ────────────────────────────────────────────────────────────

@router.post("/query/stream")
async def query_stream(
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events streaming endpoint."""
    if body.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == body.session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        title = body.message[:60] + ("…" if len(body.message) > 60 else "")
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        await db.flush()

    user_msg = ChatMessage(session_id=session.id, role="user", content=body.message)
    db.add(user_msg)
    await db.flush()

    # Commit session + user message now, before handing off to the generator.
    # The generator runs outside the request lifecycle, so it must open its own session.
    await db.commit()

    session_id = session.id
    user_id = current_user.id
    query_text = body.message

    chunks = retrieve_relevant_chunks(query_text)
    sources = [
        {"filename": c["source"], "page": c["page"], "score": c["score"]}
        for c in chunks[:3]
    ]

    collected: list[str] = []

    async def event_generator():
        # First emit sources
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

        async for token in stream_answer(query_text, chunks):
            collected.append(token)
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        full_answer = "".join(collected)

        # Use a fresh independent session — the request session may be closed/expired
        from app.models.database import AsyncSessionLocal
        async with AsyncSessionLocal() as persist_db:
            ai_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_answer,
                sources=json.dumps(sources),
            )
            persist_db.add(ai_msg)

            # Update session timestamp
            sess_result = await persist_db.execute(
                select(ChatSession).where(ChatSession.id == session_id)
            )
            sess = sess_result.scalar_one_or_none()
            if sess:
                sess.updated_at = datetime.now(timezone.utc)

            await persist_db.commit()

        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
