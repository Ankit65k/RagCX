import logging
import math
from typing import List
from app.questions.models import LLMQuestionItem
from app.embeddings.service import EmbeddingService

logger = logging.getLogger("app")


class QuestionDeduplicator:
    """
    Deduplicates generated questions using string matching for near-duplicates
    and cosine similarity of embeddings for semantic duplicates.
    """

    def __init__(self, embedding_service: EmbeddingService, similarity_threshold: float = 0.82) -> None:
        self.embedding_service = embedding_service
        self.similarity_threshold = similarity_threshold

    def _normalize(self, text: str) -> str:
        # Lowercase, strip spaces and question marks
        cleaned = text.lower().strip().replace("?", "").replace(".", "").replace(",", "")
        return " ".join(cleaned.split())

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    async def deduplicate(self, items: List[LLMQuestionItem]) -> List[LLMQuestionItem]:
        logger.info("QuestionGeneration: Deduplication started.")
        if not items:
            return []

        # 1. Near-duplicate / Exact string deduplication
        unique_items: List[LLMQuestionItem] = []
        seen_normalized = set()

        for item in items:
            normalized = self._normalize(item.question)
            if normalized in seen_normalized:
                logger.info(f"QuestionGeneration: Removed near-duplicate question: '{item.question}'")
                continue
            seen_normalized.add(normalized)
            unique_items.append(item)

        if len(unique_items) <= 1:
            logger.info(f"QuestionGeneration: Deduplication completed. Unique: {len(unique_items)}")
            return unique_items

        # 2. Semantic deduplication using vector embeddings
        try:
            texts = [item.question for item in unique_items]
            vectors = await self.embedding_service.provider.embed_documents(texts)
            
            final_items: List[LLMQuestionItem] = []
            final_vectors: List[List[float]] = []

            for item, vec in zip(unique_items, vectors):
                is_duplicate = False
                for existing_vec, existing_item in zip(final_vectors, final_items):
                    sim = self._cosine_similarity(vec, existing_vec)
                    if sim > self.similarity_threshold:
                        logger.info(
                            f"QuestionGeneration: Removed semantic duplicate: "
                            f"'{item.question}' (Sim: {sim:.2f} to '{existing_item.question}')"
                        )
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    final_items.append(item)
                    final_vectors.append(vec)

            logger.info(f"QuestionGeneration: Deduplication completed. Unique: {len(final_items)}/{len(items)}")
            return final_items

        except Exception as e:
            logger.error(f"QuestionGeneration: Semantic deduplication failed: {str(e)}. Falling back to string-only deduplication.")
            return unique_items
