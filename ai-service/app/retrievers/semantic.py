import time
import logging
from typing import Dict, Any, Optional, List

from app.retrievers.base import Retriever
from app.retrievers.models import RetrieverResult, RetrievedChunk, RetrieverStrategy
from app.retrievers.exceptions import InvalidQueryError, RetrievalError
from app.retrievers.services import QueryEmbeddingService, SearchResultRanker, ContextBuilder
from app.vector_store.base import VectorStore

logger = logging.getLogger("app")


class SemanticRetriever(Retriever):
    """
    Dense vector similarity search via Ollama embeddings + ChromaDB.

    Strategy: RetrieverStrategy.SEMANTIC
    """

    strategy = RetrieverStrategy.SEMANTIC

    def __init__(
        self,
        embedding_service: QueryEmbeddingService,
        vector_store: VectorStore,
    ) -> None:
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> RetrieverResult:
        logger.info("Retriever: Starting query retrieval execution...")
        start_time = time.perf_counter()

        # 1. Validate query constraints
        if not query or len(query.strip()) == 0:
            raise InvalidQueryError("Search query cannot be empty.")
        if len(query) > 1000: # Max query character limits guard
            raise InvalidQueryError("Search query exceeds maximum allowed length of 1000 characters.")

        try:
            # 2. Translate query string to vector coordinates
            query_vector = await self.embedding_service.embed_query(query)

            # 3. Retrieve matches from Vector Store
            matches = await self.vector_store.similarity_search(
                query_vector=query_vector,
                top_k=top_k,
                score_threshold=score_threshold,
                filter_metadata=filter_metadata,
            )

            # 4. Map matches to RetrievedChunk formats
            retrieved_chunks: List[RetrievedChunk] = []
            seen_chunk_ids = set()

            for match in matches:
                # Deduplication check
                chunk_id = match.metadata.get("chunkId", f"{match.documentId}_p{match.pageNumber}")
                if chunk_id in seen_chunk_ids:
                    continue
                seen_chunk_ids.add(chunk_id)

                retrieved_chunks.append(
                    RetrievedChunk(
                        chunkId=chunk_id,
                        text=match.text,
                        score=match.score,
                        pageNumber=match.pageNumber,
                        chunkIndex=match.chunkIndex,
                        documentId=match.documentId,
                        metadata=match.metadata,
                    )
                )

            # 5. Apply ranking order
            ranked_chunks = SearchResultRanker.rank(retrieved_chunks)

            # 6. Format context string blocks
            context = ContextBuilder.build_context(ranked_chunks)

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            logger.info(
                f"Retriever: Query retrieval completed. Found {len(ranked_chunks)} chunks in {elapsed_ms:.2f}ms."
            )

            return RetrieverResult(
                context=context,
                chunks=ranked_chunks,
                processingTimeMs=round(elapsed_ms, 2),
            )

        except Exception as e:
            if isinstance(e, InvalidQueryError):
                raise e
            raise RetrievalError(f"Error executing semantic query retrieval. Details: {str(e)}") from e
