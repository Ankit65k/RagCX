from enum import Enum
from typing import List, Dict, Any
from pydantic import BaseModel


class RetrieverStrategy(str, Enum):
    """
    Registry of all supported retrieval strategies.

    Only SEMANTIC is implemented today. The others are reserved names that
    activate when their concrete class is completed — the factory and
    the rest of the RAG pipeline require no changes.

    SEMANTIC        — Dense vector similarity search via Ollama embeddings + ChromaDB.
    HYBRID          — BM25 keyword score fused with dense vector score (reciprocal rank fusion).
    MMR             — Maximal Marginal Relevance: balances relevance with result diversity.
    CROSS_ENCODER   — Two-stage: vector candidates are re-scored by a cross-encoder reranker.
    """
    SEMANTIC = "semantic"
    HYBRID = "hybrid"
    MMR = "mmr"
    CROSS_ENCODER = "cross_encoder"


class RetrievedChunk(BaseModel):
    chunkId: str
    text: str
    score: float
    pageNumber: int
    chunkIndex: int
    documentId: str
    metadata: Dict[str, Any] = {}


class RetrieverResult(BaseModel):
    context: str
    chunks: List[RetrievedChunk]
    processingTimeMs: float
