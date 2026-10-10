import logging
from typing import List, Any

logger = logging.getLogger("app")


class RepresentativeChunkSelector:
    """
    Selects the most informative and representative text chunks from a document,
    filtering out short, redundant, or low-information fragments.
    """

    def __init__(self, min_chunk_length: int = 150, max_chunks: int = 3) -> None:
        self.min_chunk_length = min_chunk_length
        self.max_chunks = max_chunks

    def select(self, chunks: List[Any]) -> List[Any]:
        logger.info(f"QuestionGeneration: Selection started. Total candidate chunks: {len(chunks)}")

        filtered_chunks = []
        seen_texts = set()

        for chunk in chunks:
            text = getattr(chunk, "text", "")
            if not isinstance(text, str):
                text = str(text)

            cleaned_text = text.strip()

            # Filter tiny chunks
            if len(cleaned_text) < self.min_chunk_length:
                continue

            # Simple deduplication based on normalized text prefixes to avoid very similar chunks
            dedup_key = cleaned_text[:100].lower()
            if dedup_key in seen_texts:
                continue

            # Filter low-information heuristic blocks (e.g., table of contents lines, copyright footnotes)
            if cleaned_text.count("\n") > (len(cleaned_text) // 10) or cleaned_text.count("...") > 5:
                continue

            filtered_chunks.append(chunk)
            seen_texts.add(dedup_key)

        # Sample chunks spread across the document (beginning, middle, end)
        # instead of just taking the first max_chunks
        if len(filtered_chunks) <= self.max_chunks:
            selected = filtered_chunks
        else:
            # Distribute selection across the document
            step = len(filtered_chunks) / self.max_chunks
            indices = [int(i * step) for i in range(self.max_chunks)]
            selected = [filtered_chunks[i] for i in indices]

        logger.info(f"QuestionGeneration: Chunk selection completed. Selected {len(selected)} representative chunks from {len(filtered_chunks)} filtered chunks.")
        return selected
