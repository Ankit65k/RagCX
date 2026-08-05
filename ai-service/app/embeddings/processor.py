import asyncio
import logging
from typing import List, Type
from app.embeddings.base import EmbeddingProvider
from app.embeddings.exceptions import EmbeddingTimeoutError, EmbeddingError

logger = logging.getLogger("app")


class BatchEmbeddingProcessor:
    """
    Asynchronous partition processor generating embeddings in parallel batches
    with exponential retry backoff resilience.
    """

    def __init__(self, provider: EmbeddingProvider, batch_size: int = 32) -> None:
        self.provider = provider
        self.batch_size = batch_size

    async def process_batches(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        # Divide texts into batches of batch_size
        batches = [
            texts[i : i + self.batch_size]
            for i in range(0, len(texts), self.batch_size)
        ]

        logger.info(
            f"Embedding: Splitting {len(texts)} chunks into {len(batches)} batches (Size: {self.batch_size})"
        )

        tasks = [
            self._process_batch_with_retry(batch, idx)
            for idx, batch in enumerate(batches)
        ]

        # Execute batches concurrently
        results = await asyncio.gather(*tasks)

        # Flatten list of lists
        flattened: List[List[float]] = []
        for batch_res in results:
            flattened.extend(batch_res)

        return flattened

    async def _process_batch_with_retry(self, batch: List[str], batch_idx: int) -> List[List[float]]:
        retries = 3
        delay = 1.0
        max_delay = 8.0

        for attempt in range(retries):
            try:
                logger.info(f"Embedding: Starting batch {batch_idx} (Attempt {attempt + 1}/{retries})")
                
                # Execute async embeddings call
                embeddings = await self.provider.embed_documents(batch)
                
                logger.info(f"Embedding: Completed batch {batch_idx}")
                return embeddings

            except asyncio.TimeoutError as t_err:
                logger.warning(
                    f"Embedding: Timeout on batch {batch_idx}. Retrying in {delay}s... Error: {str(t_err)}"
                )
                if attempt == retries - 1:
                    raise EmbeddingTimeoutError(f"Embedding execution timed out: {str(t_err)}") from t_err

            except Exception as e:
                logger.warning(
                    f"Embedding: Error processing batch {batch_idx}. Retrying in {delay}s... Error: {str(e)}"
                )
                if attempt == retries - 1:
                    raise EmbeddingError(f"Embedding execution failed: {str(e)}") from e

            await asyncio.sleep(delay)
            delay = min(delay * 2, max_delay)

        raise EmbeddingError(f"Failed to process batch {batch_idx} after {retries} attempts.")
