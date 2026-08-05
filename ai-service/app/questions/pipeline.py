import logging
import time
from typing import List, Any, Optional

from app.core.config.settings import settings
from app.models.base import LLMProvider
from app.questions.models import QuestionGenerationResult, LLMQuestionsResponse
from app.questions.exceptions import QuestionGenerationError
from app.questions.components.chunk_selector import RepresentativeChunkSelector
from app.questions.components.prompt_builder import QuestionPromptBuilder
from app.questions.components.validator import QuestionValidator
from app.questions.components.deduplicator import QuestionDeduplicator
from app.questions.components.ranker import QuestionRanker
from app.questions.components.formatter import QuestionFormatter

logger = logging.getLogger("app")


class QuestionGenerationPipeline:
    """
    Orchestrates the pipeline process for generating suggested questions grounded in a document.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        chunk_selector: RepresentativeChunkSelector,
        prompt_builder: QuestionPromptBuilder,
        validator: QuestionValidator,
        deduplicator: QuestionDeduplicator,
        ranker: QuestionRanker,
        formatter: QuestionFormatter,
    ) -> None:
        self.llm_provider = llm_provider
        self.chunk_selector = chunk_selector
        self.prompt_builder = prompt_builder
        self.validator = validator
        self.deduplicator = deduplicator
        self.ranker = ranker
        self.formatter = formatter

    async def generate(self, chunks: List[Any], count: int = 5) -> QuestionGenerationResult:
        logger.info("QuestionGeneration: Pipeline execution started.")
        start_time = time.perf_counter()

        # Enforce constraints: count default 5, maximum 10
        count = max(1, min(count, 10))

        # Fallback if the document lacks sufficient content
        if not chunks:
            logger.info("QuestionGeneration: Document lacks sufficient content. Returning fallback empty response.")
            return QuestionGenerationResult(
                questions=[],
                metadata={
                    "status": "FALLBACK_EMPTY_CONTENT",
                    "message": "The document lacks sufficient content to generate questions.",
                },
            )

        try:
            # 1. Chunk Selection
            selected_chunks = self.chunk_selector.select(chunks)
            if not selected_chunks:
                logger.info("QuestionGeneration: No representative chunks selected. Returning fallback empty response.")
                return QuestionGenerationResult(
                    questions=[],
                    metadata={
                        "status": "FALLBACK_NO_REPRESENTATIVE_CHUNKS",
                        "message": "The document lacks representative content chunks to generate questions.",
                    },
                )

            # 2. Prompt Assembly
            messages = self.prompt_builder.build(selected_chunks, count)

            # 3. LLM Question Generation
            logger.info("QuestionGeneration: LLM generation started (Structured JSON).")
            try:
                raw_response = await self.llm_provider.chat(messages, format="json")
                raw_response = raw_response.strip()
                logger.info("QuestionGeneration: LLM generation completed.")
            except Exception as e:
                logger.error(f"QuestionGeneration: LLM request failed: {str(e)}")
                raise QuestionGenerationError(f"LLM request failed: {str(e)}") from e

            # 4. Parse JSON Response
            try:
                parsed_response = LLMQuestionsResponse.model_validate_json(raw_response)
                items = parsed_response.questions
            except Exception as e:
                logger.error(f"QuestionGeneration: Failed to parse LLM JSON output: {str(e)}")
                raise QuestionGenerationError(f"LLM generated invalid JSON: {str(e)}") from e

            # 5. Validation
            valid_items = self.validator.validate_batch(items, selected_chunks)

            # 6. Deduplication (Semantic + String)
            deduplicated_items = await self.deduplicator.deduplicate(valid_items)

            # 7. Ranking
            ranked_items = self.ranker.rank(deduplicated_items)

            # Keep only the requested count
            ranked_items = ranked_items[:count]

            # 8. Formatting
            execution_time = (time.perf_counter() - start_time) * 1000.0
            result = self.formatter.format(
                items=ranked_items,
                execution_time_ms=execution_time,
                model_used=self.llm_provider.model,
                chunks=selected_chunks,
            )

            logger.info(f"QuestionGeneration: Pipeline finished successfully in {execution_time:.2f}ms.")
            return result

        except Exception as e:
            logger.error(f"QuestionGeneration: Pipeline execution failed: {str(e)}", exc_info=True)
            if not isinstance(e, QuestionGenerationError):
                raise QuestionGenerationError(f"Pipeline execution failed: {str(e)}") from e
            raise
