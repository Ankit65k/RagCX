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

    def validate_single(self, item: LLMQuestionItem, available_pages: List[int]) -> bool:
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

        # 5. Check document relevance (grounding page numbers must exist in selected candidates)
        if not item.related_pages:
            logger.warning(f"QuestionGeneration: Question lacks related pages: '{q_text}'")
            return False
            
        for page in item.related_pages:
            if page not in available_pages:
                logger.warning(f"QuestionGeneration: Question cites unavailable page '{page}': '{q_text}'")
                return False

        return True

    def validate_batch(self, items: List[LLMQuestionItem], selected_chunks: List[Any]) -> List[LLMQuestionItem]:
        logger.info("QuestionGeneration: Validation started.")
        available_pages = [getattr(c, "pageNumber", 0) for c in selected_chunks]
        
        valid_items = []
        for item in items:
            if self.validate_single(item, available_pages):
                valid_items.append(item)

        logger.info(f"QuestionGeneration: Validation completed. Valid: {len(valid_items)}/{len(items)}.")
        
        if not valid_items:
            raise ValidationError("No generated questions passed grounding and quality validation checks.")
            
        return valid_items
