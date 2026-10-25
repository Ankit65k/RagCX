import os
from typing import List, Literal, Optional
from pydantic import Field, field_validator, ValidationError
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.config.app_config import AppConfig
from app.core.config.redis_config import RedisConfig
from app.core.config.ollama_config import OllamaConfig
from app.core.config.embedding_config import EmbeddingConfig
from app.core.config.chroma_config import ChromaConfig
from app.core.config.processing_config import ProcessingConfig
from app.core.config.langgraph_config import LangGraphConfig
from app.core.config.logging_config import LoggingConfig


class Settings(BaseSettings):
    """
    Unified Application Environment Settings.
    Loads and validates all environment parameters at startup, throwing
    ValidationError immediately if constraints fail.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # AppConfig fields
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "ragcx-ai-service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = Field(default=["*"])
    TIMEZONE: str = "UTC"

    # RedisConfig fields
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_RECONNECT_RETRIES: int = 5
    REDIS_HEALTH_TIMEOUT: float = 2.0

    # OllamaConfig fields
    LLM_PROVIDER: str = Field(default="ollama")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_CHAT_MODEL: str = Field(default="llama3.2:1b")
    OLLAMA_EMBED_MODEL: str = Field(default="nomic-embed-text")
    OLLAMA_TEMPERATURE: float = 0.1
    OLLAMA_TOP_P: float = 0.9
    OLLAMA_TOP_K: int = 40
    OLLAMA_CONTEXT_WINDOW: int = 4096
    OLLAMA_REQUEST_TIMEOUT: float = 120.0
    OLLAMA_KEEP_ALIVE: str = "30m"
    OLLAMA_STREAMING: bool = False
    OLLAMA_NUM_PREDICT: int = 300
    GEMINI_API_KEY: SecretStr = Field(default=SecretStr(""))
    GEMINI_MODEL: str = Field(default="")
    GEMINI_FALLBACK_MODEL: str = Field(default="")
    GEMINI_TOTAL_BUDGET: float = Field(default=25.0)  # Total time budget for Gemini attempts in seconds
    GEMINI_PER_ATTEMPT_CAP: float = Field(default=15.0)  # Cap per individual Gemini attempt in seconds
    LLM_FALLBACK: str = Field(default="ollama")

    # EmbeddingConfig fields
    EMBEDDING_PROVIDER: str = Field(default="Ollama")
    EMBEDDING_MODEL: str = Field(default="nomic-embed-text")
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 32
    EMBEDDING_CHUNK_SIZE: int = 800
    EMBEDDING_CHUNK_OVERLAP: int = 150

    # ChromaConfig fields
    CHROMA_PERSIST_DIR: str = Field(default="data/chroma")
    CHROMA_COLLECTION_NAME: str = "ragcx_documents"
    CHROMA_DISTANCE_METRIC: str = "cosine"
    CHROMA_TELEMETRY_DISABLED: bool = True

    # ProcessingConfig fields
    PROC_MAX_FILE_SIZE: int = Field(default=20 * 1024 * 1024)
    PROC_MAX_PAGES: int = 100
    PROC_ALLOWED_EXTENSIONS: List[str] = Field(default=["pdf"])
    PROC_ALLOWED_MIME_TYPES: List[str] = Field(default=["application/pdf"])
    PROC_CONCURRENT_LIMIT: int = 3

    # LangGraphConfig fields
    LANGGRAPH_RECURSION_LIMIT: int = 25
    LANGGRAPH_MAX_ITERATIONS: int = 10
    LANGGRAPH_MEMORY_WINDOW: int = 5
    LANGGRAPH_CHECKPOINT_ENABLED: bool = True

    # LoggingConfig fields
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_STRUCTURED: bool = True
    LOG_JSON: bool = True

    # Environmental Validations
    @field_validator("REDIS_URL")
    @classmethod
    def validate_redis_url(cls, v: str) -> str:
        if not v.startswith("redis://") and not v.startswith("rediss://"):
            raise ValueError("REDIS_URL must begin with 'redis://' or 'rediss://'")
        return v

    @field_validator("OLLAMA_BASE_URL")
    @classmethod
    def validate_ollama_url(cls, v: str) -> str:
        if not v.startswith("http://") and not v.startswith("https://"):
            raise ValueError("OLLAMA_BASE_URL must begin with 'http://' or 'https://'")
        return v

    @field_validator("CHROMA_PERSIST_DIR")
    @classmethod
    def validate_chroma_path(cls, v: str) -> str:
        # Chroma persist path shouldn't point to an invalid directory structure.
        # Check if we can extract directories or assert it is defined.
        if not v or len(v.strip()) == 0:
            raise ValueError("CHROMA_PERSIST_DIR must be a non-empty directory path.")
        return v

    # Sub-config instance generators
    @property
    def app(self) -> AppConfig:
        return AppConfig(**self.model_dump())

    @property
    def redis(self) -> RedisConfig:
        return RedisConfig(**self.model_dump())

    @property
    def ollama(self) -> OllamaConfig:
        return OllamaConfig(**self.model_dump())

    @property
    def embedding(self) -> EmbeddingConfig:
        return EmbeddingConfig(**self.model_dump())

    @property
    def chroma(self) -> ChromaConfig:
        return ChromaConfig(**self.model_dump())

    @property
    def processing(self) -> ProcessingConfig:
        return ProcessingConfig(**self.model_dump())

    @property
    def langgraph(self) -> LangGraphConfig:
        return LangGraphConfig(**self.model_dump())

    @property
    def logging(self) -> LoggingConfig:
        return LoggingConfig(**self.model_dump())


# Instantiate global setting (environment validation will fail immediately here)
try:
    settings = Settings()
except ValidationError as e:
    import sys
    print(f"CRITICAL CONFIGURATION ERROR: Environment validation failed.\n{e}", file=sys.stderr)
    sys.exit(1)
