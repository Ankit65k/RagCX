import logging
from typing import List

from app.retrievers.models import RetrievedChunk

logger = logging.getLogger("app")

# Defaults — overridden by config injection at pipeline level
_DEFAULT_MAX_CHUNKS: int = 5
_DEFAULT_MAX_CHARS: int = 4000


class ContextRanker:
    """
    Re-ranks and trims retrieved chunks before prompt assembly.

    Ranking key:  (-score, pageNumber, chunkIndex)
        • Highest similarity score first
        • Within equal scores: logical reading order (page → chunk)

    Enforcement:
        • Caps the list at max_context_chunks
        • Drops further chunks once the cumulative character budget is exhausted
          (preserving page + chunk order within the budget)

    Doing this here — not inside the Retriever — keeps the Retriever
    single-purpose: it finds candidates. The ranker decides what fits.
    """

    def __init__(
        self,
        max_context_chunks: int = _DEFAULT_MAX_CHUNKS,
        max_context_chars: int = _DEFAULT_MAX_CHARS,
    ) -> None:
        self.max_context_chunks = max_context_chunks
        self.max_context_chars = max_context_chars

    def rank(self, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        if not chunks:
            return []

        # Primary sort by score DESC, then reading order
        sorted_chunks = sorted(
            chunks,
            key=lambda c: (-c.score, c.pageNumber, c.chunkIndex),
        )

        # Enforce chunk count cap
        sorted_chunks = sorted_chunks[:self.max_context_chunks]

        # Enforce character budget (accumulate; stop when budget exhausted)
        ranked: List[RetrievedChunk] = []
        total_chars = 0
        for chunk in sorted_chunks:
            chunk_len = len(chunk.text)
            if total_chars + chunk_len > self.max_context_chars:
                logger.warning(
                    f"ContextRanker: Character budget ({self.max_context_chars}) "
                    f"reached after {len(ranked)} chunks — truncating."
                )
                break
            ranked.append(chunk)
            total_chars += chunk_len

        logger.info(
            f"ContextRanker: {len(chunks)} chunks → {len(ranked)} ranked "
            f"({total_chars} chars used of {self.max_context_chars} budget)."
        )
        return ranked
