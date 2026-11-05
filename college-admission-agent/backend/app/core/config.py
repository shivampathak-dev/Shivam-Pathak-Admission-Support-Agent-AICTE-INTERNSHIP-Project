"""
Application configuration — reads all settings from environment variables.
Falls back to safe defaults so the app boots without a .env file (mock mode).
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────
    APP_NAME: str = "College Admission Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── JWT Auth ─────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_32_CHARS_MIN"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 h

    # ── IBM watsonx.ai ───────────────────────────────────────────────────
    IBM_WATSONX_API_KEY: str = ""
    IBM_WATSONX_PROJECT_ID: str = ""
    IBM_WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    IBM_GRANITE_MODEL_ID: str = "ibm/granite-3-8b-instruct"

    # ── Embeddings ───────────────────────────────────────────────────────
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    # ── ChromaDB ─────────────────────────────────────────────────────────
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    CHROMA_COLLECTION_NAME: str = "college_docs"

    # ── Upload ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./data/uploaded_pdfs"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── RAG ──────────────────────────────────────────────────────────────
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    RETRIEVER_TOP_K: int = 5

    # ── SQLite ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./data/admission_agent.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
