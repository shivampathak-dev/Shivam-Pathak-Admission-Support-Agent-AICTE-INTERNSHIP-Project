"""
FastAPI application entry point.
Run the whole project with:  python3 app/main.py
"""
import logging
import os
import sys
import warnings
from pathlib import Path

# ── Silence noisy third-party warnings ────────────────────────────────────────
os.environ["HF_HUB_OFFLINE"]      = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
warnings.filterwarnings("ignore")

# ── Make `app.*` importable when file is run directly ─────────────────────────
BACKEND_DIR  = Path(__file__).resolve().parent.parent   # …/backend/
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"          # …/frontend/
sys.path.insert(0, str(BACKEND_DIR))

import uvicorn
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.admin import router as admin_router
from app.core.config import get_settings
from app.models.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    await init_db()
    logger.info("✅ Database initialised")

    from app.rag.ingestion import get_embedding_model
    try:
        get_embedding_model()
        logger.info("✅ Embedding model loaded")
    except Exception as e:
        logger.warning("⚠️  Embedding model failed to load: %s", e)

    yield
    # ── Shutdown ───────────────────────────────────────────────────────────
    logger.info("Server shutting down…")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="RAG-powered College Admission Counsellor using IBM Granite & ChromaDB",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


# ── Entry point: python3 app/main.py ──────────────────────────────────────────
if __name__ == "__main__":
    import socket
    import subprocess
    import threading
    import time
    import webbrowser

    def _port_ready(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(("127.0.0.1", port)) == 0

    def _wait_port(port: int, timeout: int = 30) -> bool:
        for _ in range(timeout * 2):
            if _port_ready(port):
                return True
            time.sleep(0.5)
        return False

    # Kill anything already on port 3000 (stale Next.js)
    subprocess.run("lsof -ti tcp:3000 | xargs kill -9", shell=True,
                   capture_output=True)
    time.sleep(0.5)

    # Start Next.js (production — instant, no compile step)
    frontend_proc = subprocess.Popen(
        ["npm", "run", "start"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    logger.info("🚀 Frontend starting on http://localhost:3000 …")

    # Open browser once port 3000 is accepting connections
    def _open_browser():
        if _wait_port(3000, timeout=20):
            logger.info("🌐 Opening http://localhost:3000 in browser")
            webbrowser.open("http://localhost:3000")
        else:
            logger.warning("⚠️  Frontend took too long — open http://localhost:3000 manually")

    threading.Thread(target=_open_browser, daemon=True).start()

    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
    finally:
        frontend_proc.terminate()
        logger.info("✅ Frontend stopped")
