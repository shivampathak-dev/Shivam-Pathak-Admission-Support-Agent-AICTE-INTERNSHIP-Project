"""
IBM Granite LLM wrapper.

Priority:
  1. IBM watsonx.ai SDK (ibm-watsonx-ai) if API key + project ID are set.
  2. Graceful mock fallback during local testing / CI without credentials.
"""
from __future__ import annotations  # defer annotation evaluation — Python 3.13 compat
import logging
from typing import AsyncGenerator

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Prompt builder ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert College Admission Counsellor for our institution.
Your ONLY source of truth is the context passages retrieved from official college documents.

Rules:
- Answer ONLY based on the provided context passages.
- If the context does not contain enough information, reply:
  "I'm sorry, I couldn't find a verified answer in the official documents. Please contact the Admissions Office directly."
- Never fabricate fees, dates, eligibility criteria, or policies.
- Format responses with Markdown: use bullet points, bold headings, and tables where helpful.
- Be concise, friendly, and professional.
"""


def _build_prompt(query: str, context_chunks: list[dict]) -> str:
    context_text = "\n\n".join(
        f"[Source: {c['source']}, Page {c['page']}]\n{c['content']}"
        for c in context_chunks
    )
    return f"""{SYSTEM_PROMPT}

--- RETRIEVED CONTEXT ---
{context_text}
--- END OF CONTEXT ---

Student Question: {query}

Answer:"""


# ── watsonx.ai client (singleton) ────────────────────────────────────────────

_watsonx_model = None          # module-level singleton — initialised once
_watsonx_init_attempted = False


def _get_watsonx_model():
    """
    Return the cached watsonx ModelInference instance (initialised once).
    Returns None if credentials are not configured or SDK is missing.
    """
    global _watsonx_model, _watsonx_init_attempted

    if _watsonx_init_attempted:
        return _watsonx_model

    _watsonx_init_attempted = True

    if not settings.IBM_WATSONX_API_KEY or not settings.IBM_WATSONX_PROJECT_ID:
        return None

    try:
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

        credentials = Credentials(
            url=settings.IBM_WATSONX_URL,
            api_key=settings.IBM_WATSONX_API_KEY,
        )
        _watsonx_model = ModelInference(
            model_id=settings.IBM_GRANITE_MODEL_ID,
            credentials=credentials,
            project_id=settings.IBM_WATSONX_PROJECT_ID,
            params={
                GenParams.MAX_NEW_TOKENS: 1024,
                GenParams.TEMPERATURE: 0.2,
                GenParams.TOP_P: 0.9,
                GenParams.REPETITION_PENALTY: 1.1,
            },
        )
        logger.info("IBM watsonx.ai model initialised: %s", settings.IBM_GRANITE_MODEL_ID)
    except ImportError:
        logger.warning("ibm-watsonx-ai package not installed. Using mock fallback.")
    except Exception as exc:
        logger.error("Failed to initialise watsonx model: %s", exc)

    return _watsonx_model


# ── Mock fallback ─────────────────────────────────────────────────────────────

def _mock_response(query: str, context_chunks: list[dict]) -> str:
    # Filter to reasonably relevant chunks
    relevant = [c for c in context_chunks if c.get("score", 0) >= 0.20]
    if not relevant:
        return (
            "I'm sorry, I couldn't find a verified answer in the official documents regarding your query. "
            "Please contact the Admissions Office directly:\n\n"
            "- **Email:** admissions@college.edu\n"
            "- **Phone:** +91-11-23456789 / 1800-123-4567\n"
            "- **Hours:** Monday to Saturday, 9:00 AM – 5:00 PM\n\n"
            "*(No matching verified sections found in indexed documents)*"
        )

    import re

    # Use the top matching chunk(s)
    top_chunk = relevant[0]
    raw_content = top_chunk.get("content", "").strip()

    # Clean redundant header branding lines if present
    content = raw_content
    for header in [
        "NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE",
        "OFFICIAL ADMISSION BROCHURE & PROSPECTUS (ACADEMIC YEAR 2025-2026)",
        "OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)",
    ]:
        content = content.replace(header, "").strip()

    # Format bullet lists cleanly for markdown rendering
    content = re.sub(r'\s+-\s+', '\n- ', content)
    content = re.sub(r'\s+\*\s+', '\n  * ', content)
    content = re.sub(r'(\d+\.\s+[A-Z\s]{4,}:)', r'\n\n### \1\n', content)
    content = re.sub(r'(\d+\.\s+)', r'\n\1', content)

    sources_summary = ", ".join(
        f"`{c['source']}` (Page {c['page']})" for c in relevant[:2]
    )

    return (
        f"Based on the official college documents, here is the verified information regarding **\"{query}\"**:\n\n"
        f"{content.strip()}\n\n"
        f"---\n"
        f"📖 **Verified Sources:** {sources_summary}\n\n"
        f"*(Running in IBM Granite local RAG mode. Connect IBM watsonx.ai in `.env` for full generative reasoning)*"
    )


# ── Main generation function ──────────────────────────────────────────────────

async def generate_answer(
    query: str,
    context_chunks: list[dict],
) -> tuple[str, list[dict]]:
    """
    Generate an answer and return (answer_text, sources).
    sources = subset of context_chunks used (top 3).
    """
    model = _get_watsonx_model()

    if model is None:
        # Mock fallback
        answer = _mock_response(query, context_chunks)
    else:
        prompt = _build_prompt(query, context_chunks)
        try:
            response = model.generate_text(prompt=prompt)
            answer = response.strip() if isinstance(response, str) else str(response)
        except Exception as exc:
            logger.error("watsonx generation error: %s", exc)
            answer = (
                "I encountered an error connecting to IBM Granite. "
                "Please try again or contact support."
            )

    # Return top 3 unique sources
    seen = set()
    sources = []
    for chunk in context_chunks:
        key = (chunk["source"], chunk["page"])
        if key not in seen:
            seen.add(key)
            sources.append({
                "filename": chunk["source"],
                "page": chunk["page"],
                "score": chunk.get("score", 0),
            })
        if len(sources) >= 3:
            break

    return answer, sources


async def stream_answer(
    query: str,
    context_chunks: list[dict],
) -> AsyncGenerator[str, None]:
    """
    Streaming variant — yields text tokens as SSE data strings.
    Falls back to chunked mock output if watsonx is not available.
    """
    model = _get_watsonx_model()

    if model is None:
        full = _mock_response(query, context_chunks)
        for word in full.split(" "):
            yield word + " "
        return

    prompt = _build_prompt(query, context_chunks)
    try:
        for chunk in model.generate_text_stream(prompt=prompt):
            if isinstance(chunk, str):
                yield chunk
            elif hasattr(chunk, "generated_text"):
                yield chunk.generated_text
    except Exception as exc:
        logger.error("watsonx stream error: %s", exc)
        yield "\n\n⚠️ Error connecting to IBM Granite. Please try again."


def check_watsonx_health() -> dict:
    """Quick health check for the IBM watsonx connection."""
    if not settings.IBM_WATSONX_API_KEY or not settings.IBM_WATSONX_PROJECT_ID:
        return {
            "status": "mock",
            "message": "No IBM credentials configured — running in demo mode.",
            "model": settings.IBM_GRANITE_MODEL_ID,
        }
    model = _get_watsonx_model()
    if model is None:
        return {
            "status": "error",
            "message": "Failed to initialise watsonx model. Check credentials.",
            "model": settings.IBM_GRANITE_MODEL_ID,
        }
    return {
        "status": "connected",
        "message": "IBM watsonx.ai is reachable.",
        "model": settings.IBM_GRANITE_MODEL_ID,
    }
