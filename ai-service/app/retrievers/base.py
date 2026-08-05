from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.retrievers.models import RetrieverResult, RetrieverStrategy


class Retriever(ABC):
    """
    Abstract Base Class for all retrieval strategies.

    Extension contract:
        1. Create a new file in app/retrievers/ (e.g. hybrid.py).
        2. Subclass Retriever and set the class-level `strategy` attribute.
        3. Implement `retrieve()`.
        4. Register the new class in RetrieverFactory._registry.

    No changes needed anywhere else in the RAG pipeline.
    """

    # Subclasses MUST declare which strategy they implement.
    strategy: RetrieverStrategy

    @abstractmethod
    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> RetrieverResult:
        """
        Execute retrieval for the given query.
        Returns ranked chunks and a formatted context string ready for LLM consumption.
        """
        pass
