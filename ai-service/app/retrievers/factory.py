import logging
from typing import Dict, Type

from app.retrievers.base import Retriever
from app.retrievers.models import RetrieverStrategy
from app.retrievers.semantic import SemanticRetriever
from app.retrievers.hybrid import HybridRetriever
from app.retrievers.mmr import MMRRetriever
from app.retrievers.cross_encoder import CrossEncoderRetriever
from app.retrievers.services import QueryEmbeddingService
from app.vector_store.base import VectorStore
from app.retrievers.exceptions import RetrievalError

logger = logging.getLogger("app")


class RetrieverFactory:
    """
    Strategy-based factory for all Retriever implementations.

    Adding a new strategy requires only two steps:
        1. Create a subclass of Retriever (e.g. app/retrievers/hybrid.py).
        2. Add it to _registry below.

    The rest of the RAG pipeline — container.py, event handlers, API routes —
    never need to change.

    Current registry:
        SEMANTIC      → SemanticRetriever   [IMPLEMENTED]
        HYBRID        → HybridRetriever     [STUB — not yet implemented]
        MMR           → MMRRetriever        [STUB — not yet implemented]
        CROSS_ENCODER → CrossEncoderRetriever [STUB — not yet implemented]
    """

    _registry: Dict[RetrieverStrategy, Type[Retriever]] = {
        RetrieverStrategy.SEMANTIC: SemanticRetriever,
        RetrieverStrategy.HYBRID: HybridRetriever,
        RetrieverStrategy.MMR: MMRRetriever,
        RetrieverStrategy.CROSS_ENCODER: CrossEncoderRetriever,
    }

    @classmethod
    def get_retriever(
        cls,
        embedding_service: QueryEmbeddingService,
        vector_store: VectorStore,
        retrieval_strategy: str = RetrieverStrategy.SEMANTIC,
    ) -> Retriever:
        try:
            strategy = RetrieverStrategy(retrieval_strategy)
        except ValueError:
            valid = [s.value for s in RetrieverStrategy]
            raise RetrievalError(
                f"Unknown retrieval strategy '{retrieval_strategy}'. "
                f"Valid options: {valid}"
            )

        retriever_cls = cls._registry.get(strategy)
        if retriever_cls is None:
            raise RetrievalError(f"No implementation registered for strategy '{strategy.value}'.")

        logger.info(f"Factory: Instantiating {retriever_cls.__name__} (strategy={strategy.value})...")
        return retriever_cls(
            embedding_service=embedding_service,
            vector_store=vector_store,
        )
