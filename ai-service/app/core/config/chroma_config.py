from pydantic import BaseModel, Field


class ChromaConfig(BaseModel):
    """
    Settings for ChromaDB Vector Database instances.
    """
    CHROMA_PERSIST_DIR: str = Field(default="data/chroma")
    CHROMA_COLLECTION_NAME: str = "ragcx_documents"
    CHROMA_DISTANCE_METRIC: str = "cosine"
    CHROMA_TELEMETRY_DISABLED: bool = True
