import logging
from typing import List, Any
from app.questions.models import LLMQuestionItem
from app.questions.exceptions import ValidationError

logger = logging.getLogger("app")


class QuestionValidator:
    """
    Validates generated suggested questions for length, relevance, and genericness.
    """

    def __init__(self, min_length: int = 15, max_length: int = 250) -> None:
        self.min_length = min_length
        self.max_length = max_length
        self.generic_keywords = {
            "what is this document",
            "what is this about",
            "can you summarize",
            "what is the summary",
            "tell me more about this",
            "who wrote this",
            "what is the main idea",
            "document about",
            "explain this document",
        }

    def validate_single(self, item: LLMQuestionItem, available_pages: List[int], chunk_texts: List[str] = None) -> bool:
        q_text = item.question.strip()

        # 1. Check for empty questions
        if not q_text:
            logger.warning("QuestionGeneration: Empty question generated.")
            return False

        # 2. Check length limits
        if len(q_text) < self.min_length or len(q_text) > self.max_length:
            logger.warning(f"QuestionGeneration: Question failed length check: '{q_text}' (len: {len(q_text)})")
            return False

        # 3. Check for generic questions
        normalized_q = q_text.lower()
        if any(keyword in normalized_q for keyword in self.generic_keywords):
            logger.warning(f"QuestionGeneration: Question identified as generic: '{q_text}'")
            return False

        # 4. Check for invalid or missing question mark
        if not q_text.endswith("?"):
            logger.warning(f"QuestionGeneration: Question does not end with question mark: '{q_text}'")
            return False

        # 5. Check document relevance - question must have keyword overlap with chunks
        if chunk_texts:
            q_words = set(normalized_q.split())
            chunk_words = set(" ".join(chunk_texts).lower().split())
            # Remove common stopwords
            stopwords = {"the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had", "what", "who", "when", "where", "why", "how", "this", "that", "these", "those", "it", "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or", "but", "if", "then", "be", "been", "being"}
            q_keywords = q_words - stopwords
            chunk_keywords = chunk_words - stopwords
            overlap = q_keywords & chunk_keywords
            if len(overlap) < 2:  # At least 2 meaningful words should overlap
                logger.warning(f"QuestionGeneration: Question has insufficient keyword overlap with chunks: '{q_text}'")
                return False

        # 6. Check document relevance (grounding page numbers must exist in selected candidates)
        if not item.related_pages:
            logger.warning(f"QuestionGeneration: Question lacks related pages: '{q_text}'")
            return False

        for page in item.related_pages:
            if page not in available_pages:
                logger.warning(f"QuestionGeneration: Question cites unavailable page '{page}': '{q_text}'")
                return False

        return True

    def validate_batch(self, items: List[LLMQuestionItem], selected_chunks: List[Any], request_id: str = "unknown") -> List[LLMQuestionItem]:
        logger.info(f"[{request_id}] Validation started for {len(items)} questions")
        available_pages = [getattr(c, "pageNumber", 0) for c in selected_chunks]
        chunk_texts = [getattr(c, "text", "") for c in selected_chunks]

        valid_items = []
        dropped_reasons = []

        for idx, item in enumerate(items):
            q_text = item.question.strip()

            # Track why each question is dropped
            if not q_text:
                reason = f"Q{idx+1}: Empty question"
                logger.warning(f"[{request_id}] DROPPED - {reason}")
                dropped_reasons.append(reason)
                continue

            if len(q_text) < self.min_length or len(q_text) > self.max_length:
                reason = f"Q{idx+1}: Length {len(q_text)} outside [{self.min_length}, {self.max_length}]"
                logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                dropped_reasons.append(reason)
                continue

            normalized_q = q_text.lower()
            if any(keyword in normalized_q for keyword in self.generic_keywords):
                reason = f"Q{idx+1}: Generic question detected"
                logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                dropped_reasons.append(reason)
                continue

            if not q_text.endswith("?"):
                reason = f"Q{idx+1}: No question mark"
                logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                dropped_reasons.append(reason)
                continue

            # Check keyword overlap
            if chunk_texts:
                q_words = set(normalized_q.split())
                chunk_words = set(" ".join(chunk_texts).lower().split())
                stopwords = {"the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had", "what", "who", "when", "where", "why", "how", "this", "that", "these", "those", "it", "in", "on", "at", "to", "for", "of", "with", "by", "from", "and", "or", "but", "if", "then", "be", "been", "being"}
                q_keywords = q_words - stopwords
                chunk_keywords = chunk_words - stopwords
                overlap = q_keywords & chunk_keywords
                if len(overlap) < 2:
                    reason = f"Q{idx+1}: Insufficient keyword overlap ({len(overlap)} words)"
                    logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                    dropped_reasons.append(reason)
                    continue

            # Check page grounding
            if not item.related_pages:
                reason = f"Q{idx+1}: No related pages"
                logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                dropped_reasons.append(reason)
                continue

            invalid_pages = [p for p in item.related_pages if p not in available_pages]
            if invalid_pages:
                reason = f"Q{idx+1}: Invalid pages {invalid_pages}"
                logger.warning(f"[{request_id}] DROPPED - {reason}: '{q_text[:50]}...'")
                dropped_reasons.append(reason)
                continue

            # Question passed all checks
            valid_items.append(item)
            logger.debug(f"[{request_id}] VALID - Q{idx+1}: '{q_text[:50]}...'")

        logger.info(f"[{request_id}] Validation completed. Valid: {len(valid_items)}/{len(items)}. Dropped: {len(dropped_reasons)}")

        if dropped_reasons:
            logger.info(f"[{request_id}] DROP_REASONS: {dropped_reasons}")

        if not valid_items:
            raise ValidationError(f"No generated questions passed validation. Reasons: {dropped_reasons}")

        return valid_items
