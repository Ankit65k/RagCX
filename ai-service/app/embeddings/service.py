import time
import logging
from typing import List

from app.processors.models import DocumentChunk
from app.embeddings.base import EmbeddingProvider
from app.embeddings.processor import BatchEmbeddingProcessor
from app.embeddings.models import EmbeddingItem, EmbeddingStats, EmbeddingResult
from app.embeddings.exceptions import EmbeddingValidationError
from app.core.config.settings import settings

logger = logging.getLogger("app")


class EmbeddingService:
    """
    Core orchestrator validating inputs, coordinating batch processors, and
    compiling results for vector indexing.
    """

    def __init__(self, provider: EmbeddingProvider) -> None:
        self.provider = provider
        self.processor = BatchEmbeddingProcessor(
            provider=provider,
            batch_size=settings.EMBEDDING_BATCH_SIZE,
        )
        self.expected_dim = settings.EMBEDDING_DIMENSIONS

    async def embed_chunks(self, chunks: List[DocumentChunk]) -> EmbeddingResult:
        logger.info(f"Embedding: Starting generation for {len(chunks)} document chunks.")
        start_time = time.perf_counter()

        if not chunks:
            raise EmbeddingValidationError("Chunk list cannot be empty.")

        # 1. Validation Checks
        texts: List[str] = []
        for c in chunks:
            if not c.text or len(c.text.strip()) == 0:
                raise EmbeddingValidationError(f"Chunk text cannot be empty (Chunk ID: {c.chunkId}).")
            texts.append(c.text)

        # 2. Batch processing delegation
        vectors = await self.processor.process_batches(texts)

        # 3. Validation on vector bounds
        if len(vectors) != len(chunks):
            raise EmbeddingValidationError(
                f"Vector generation length mismatch: processed {len(vectors)} vectors for {len(chunks)} chunks."
            )

        items: List[EmbeddingItem] = []
        for idx, vec in enumerate(vectors):
            if len(vec) != self.expected_dim:
                # Some models return different dimensions; fail fast if configurations mismatch
                raise EmbeddingValidationError(
                    f"Vector dimension mismatch. Expected: {self.expected_dim}, Found: {len(vec)} "
                    f"on chunk {chunks[idx].chunkId}"
                )

            items.append(
                EmbeddingItem(
                    chunkId=chunks[idx].chunkId,
                    documentId=chunks[idx].documentId,
                    vector=vec,
                    pageNumber=chunks[idx].pageNumber,
                    chunkIndex=chunks[idx].chunkIndex,
                    metadata={
                        "text": chunks[idx].text,
                        "startOffset": chunks[idx].startOffset,
                        "endOffset": chunks[idx].endOffset,
                        "charCount": chunks[idx].characterCount,
                        "wordCount": chunks[idx].wordCount,
                    },
                )
            )

        # 4. Generate statistics
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        avg_time = elapsed_ms / len(chunks) if chunks else 0.0

        stats = EmbeddingStats(
            embeddingCount=len(chunks),
            processingTimeMs=round(elapsed_ms, 2),
            averageTimeMs=round(avg_time, 2),
            modelUsed=settings.EMBEDDING_MODEL,
            vectorDimension=self.expected_dim,
        )

        logger.info(
            f"Embedding: Completed vector generation for {len(chunks)} chunks in {elapsed_ms:.2f}ms."
        )

        return EmbeddingResult(
            embeddings=items,
            statistics=stats,
        )
