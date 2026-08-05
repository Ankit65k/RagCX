from typing import Dict, Any, Optional

from app.retrievers.base import Retriever
from app.retrievers.models import RetrieverResult, RetrieverStrategy


class HybridRetriever(Retriever):
    """
    Hybrid BM25 + Dense Vector Retriever (NOT YET IMPLEMENTED).

    Strategy: RetrieverStrategy.HYBRID

    Design intent:
        Fuses sparse keyword scores (BM25) with dense vector scores using
        Reciprocal Rank Fusion (RRF). This is particularly effective for
        queries containing rare technical terms, product codes, or named
        entities that pure semantic search may underweight.

    To implement:
        1. Add a BM25 index (e.g. rank_bm25, Elasticsearch) alongside ChromaDB.
        2. Run both searches in parallel.
        3. Merge results via RRF: score = Σ 1 / (k + rank_i) for each list.
        4. Return the top-k fused candidates.
        5. Remove this NotImplementedError.
    """

    strategy = RetrieverStrategy.HYBRID

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> RetrieverResult:
        raise NotImplementedError(
            "HybridRetriever is not yet implemented. "
            "Use RetrieverStrategy.SEMANTIC until hybrid indexing is available."
        )
