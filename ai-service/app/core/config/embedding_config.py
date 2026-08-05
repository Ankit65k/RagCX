from pydantic import BaseModel, Field


class EmbeddingConfig(BaseModel):
    """
    Model embedding and document chunking configurations.
    """
    EMBEDDING_PROVIDER: str = Field(default="Ollama")
    EMBEDDING_MODEL: str = Field(default="nomic-embed-text")
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 32
    EMBEDDING_CHUNK_SIZE: int = 500
    EMBEDDING_CHUNK_OVERLAP: int = 50
