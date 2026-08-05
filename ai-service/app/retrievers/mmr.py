from typing import Dict, Any, Optional

from app.retrievers.base import Retriever
from app.retrievers.models import RetrieverResult, RetrieverStrategy


class MMRRetriever(Retriever):
    """
    Maximal Marginal Relevance Retriever (NOT YET IMPLEMENTED).

    Strategy: RetrieverStrategy.MMR

    Design intent:
        MMR trades off relevance against result diversity. Given a query vector q
        and an already-selected set S, each new candidate c is chosen to maximise:

            MMR(c) = λ · sim(c, q) − (1 − λ) · max_{s ∈ S} sim(c, s)

        λ (lambda_mult) controls the relevance/diversity balance (0 = full diversity,
        1 = full relevance). This prevents the top-k results from all being near-
        duplicate chunks of the same paragraph.

    To implement:
        1. Perform an over-fetched vector search (e.g. top_k * fetch_k).
        2. Iteratively select candidates using the MMR objective above.
        3. Accept lambda_mult as a configurable parameter.
        4. Remove this NotImplementedError.
    """

    strategy = RetrieverStrategy.MMR

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> RetrieverResult:
        raise NotImplementedError(
            "MMRRetriever is not yet implemented. "
            "Use RetrieverStrategy.SEMANTIC until MMR diversity selection is available."
        )
