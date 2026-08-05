from typing import List, Dict, Any
from pydantic import BaseModel


class EmbeddingItem(BaseModel):
    chunkId: str
    documentId: str
    vector: List[float]
    pageNumber: int
    chunkIndex: int
    metadata: Dict[str, Any]


class EmbeddingStats(BaseModel):
    embeddingCount: int
    processingTimeMs: float
    averageTimeMs: float
    modelUsed: str
    vectorDimension: int


class EmbeddingResult(BaseModel):
    embeddings: List[EmbeddingItem]
    statistics: EmbeddingStats
