import logging
from typing import List, Dict, Any

from app.embeddings.base import EmbeddingProvider
from app.retrievers.models import RetrievedChunk
from app.retrievers.exceptions import EmbeddingGenerationError
from app.core.config.settings import settings

logger = logging.getLogger("app")


class QueryEmbeddingService:
    """
    Translates natural language search queries to dense vector dimensions.
    """

    def __init__(self, provider: EmbeddingProvider) -> None:
        self.provider = provider

    async def embed_query(self, query: str) -> List[float]:
        try:
            logger.info("Retriever: Generating query vector embedding...")
            vector = await self.provider.embed_query(query)
            return vector
        except Exception as e:
            raise EmbeddingGenerationError(f"Failed to generate query embedding. Error: {str(e)}") from e


class SearchResultRanker:
    """
    Ranks retrieval candidates. Sorts primarily by similarity score (descending),
    and secondarily by page number (ascending) & chunk index (ascending) to maintain logical flow.
    """

    @staticmethod
    def rank(chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        # Sort descending by score, ascending by page number, ascending by chunk index
        logger.info(f"Retriever: Sorting and ranking {len(chunks)} search candidates...")
        return sorted(
            chunks,
            key=lambda x: (-x.score, x.pageNumber, x.chunkIndex),
        )


class ContextBuilder:
    """
    Formats retrieved candidates into a structured context string for LLM completion,
    enforcing character size limits to prevent prompt token exhaustion.
    """

    @staticmethod
    def build_context(chunks: List[RetrievedChunk]) -> str:
        logger.info("Retriever: Formatting retrieval contexts...")
        context_parts = []
        char_count = 0
        max_chars = settings.EMBEDDING_CHUNK_SIZE * 5 # Config default placeholder check

        for c in chunks:
            # Build chunk layout block with metadata headers
            block = (
                f"[Source Document: {c.documentId} | Chunk ID: {c.chunkId} | Page: {c.pageNumber} | Score: {c.score:.4f}]\n"
                f"{c.text}\n"
                f"---"
            )
            
            block_len = len(block)
            if char_count + block_len > max_chars:
                logger.warning(
                    f"Retriever: Context length exceeded character limit ({max_chars}). Truncating blocks."
                )
                break
                
            context_parts.append(block)
            char_count += block_len

        return "\n\n".join(context_parts)
