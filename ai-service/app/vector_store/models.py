from typing import List, Dict, Any
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    text: str
    metadata: Dict[str, Any]
    score: float
    documentId: str
    pageNumber: int
    chunkIndex: int


class CollectionStats(BaseModel):
    totalDocuments: int
    totalChunks: int
    collectionSizeByte: int
    embeddingModel: str
    dimension: int
