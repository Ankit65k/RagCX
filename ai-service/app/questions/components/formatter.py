import uuid
import logging
from typing import List, Dict, Any
from app.questions.models import LLMQuestionItem, SuggestedQuestion, QuestionGenerationResult

logger = logging.getLogger("app")


class QuestionFormatter:
    """
    Formats parsed, validated, and ranked questions into final QuestionGenerationResult.
    """

    def format(
        self,
        items: List[LLMQuestionItem],
        execution_time_ms: float,
        model_used: str,
        chunks: List[Any],
    ) -> QuestionGenerationResult:
        logger.info("QuestionGeneration: Formatting response started.")
        
        suggested_questions = []
        for idx, item in enumerate(items):
            # Generate a stable or unique question ID
            question_id = f"q-{uuid.uuid4().hex[:8]}"
            
            # Look up matching chunk IDs from selected chunks that match the cited pages
            matching_chunk_ids = [
                getattr(c, "chunkId", "")
                for c in chunks
                if getattr(c, "pageNumber", 0) in item.related_pages
            ]
            
            suggested_questions.append(
                SuggestedQuestion(
                    questionId=question_id,
                    question=item.question,
                    confidence=item.confidence,
                    relatedPages=item.related_pages,
                    relatedChunkIds=matching_chunk_ids if matching_chunk_ids else None,
                )
            )

        metadata = {
            "executionTimeMs": round(execution_time_ms, 2),
            "modelUsed": model_used,
            "chunksAnalyzedCount": len(chunks),
            "totalQuestionsGenerated": len(suggested_questions),
        }

        result = QuestionGenerationResult(
            questions=suggested_questions,
            metadata=metadata,
        )
        logger.info(f"QuestionGeneration: Formatting response completed. Formatted {len(suggested_questions)} questions.")
        return result
