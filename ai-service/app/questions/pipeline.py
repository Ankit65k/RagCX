
import logging
import re
import time
from typing import Any, List

from app.models.base import LLMProvider
from app.questions.models import QuestionGenerationResult
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
    Generates document-grounded suggested questions using an LLM,
    then validates, deduplicates, ranks, and formats them.
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

    async def generate(
        self,
        chunks: List[Any],
        count: int = 4,
        request_id: str = "unknown",
    ) -> QuestionGenerationResult:
        logger.info(
            "QuestionGeneration: Pipeline started. RequestId: %s",
            request_id,
        )
        start_time = time.perf_counter()
        count = max(1, min(count, 10))

        if not chunks:
            logger.info("[%s] Document contains no chunks.", request_id)
            return QuestionGenerationResult(
                questions=[],
                metadata={
                    "status": "FALLBACK_EMPTY_CONTENT",
                    "message": "The document lacks sufficient content to generate questions.",
                    "requestId": request_id,
                },
            )

        try:
            # 1. Select representative document chunks.
            selected_chunks = self.chunk_selector.select(chunks)

            if not selected_chunks:
                logger.warning(
                    "[%s] No representative chunks selected.",
                    request_id,
                )
                return QuestionGenerationResult(
                    questions=[],
                    metadata={
                        "status": "FALLBACK_NO_REPRESENTATIVE_CHUNKS",
                        "message": "No representative content chunks were found.",
                        "requestId": request_id,
                    },
                )

            # 2. Build the LLM prompt.
            messages = self.prompt_builder.build(selected_chunks, count)

            # 3. Generate questions.
            logger.info(
                "[%s] LLM generation started with 60-second timeout.",
                request_id,
            )

            try:
                raw_response = await self.llm_provider.chat(
                    messages,
                    timeout=60.0,
                )
                raw_response = (raw_response or "").strip()

                logger.info(
                    "[%s] LLM response received: %d characters.",
                    request_id,
                    len(raw_response),
                )
                logger.debug(
                    "[%s] LLM raw response: %s",
                    request_id,
                    raw_response[:1500],
                )

                if not raw_response:
                    return QuestionGenerationResult(
                        questions=[],
                        metadata={
                            "status": "EMPTY_LLM_RESPONSE",
                            "message": "The language model returned an empty response.",
                            "requestId": request_id,
                        },
                    )

            except Exception as exc:
                error_msg = f"LLM generation failed: {exc}"
                logger.error("[%s] %s", request_id, error_msg)

                return QuestionGenerationResult(
                    questions=[],
                    metadata={
                        "status": "LLM_GENERATION_FAILED",
                        "message": error_msg,
                        "requestId": request_id,
                        "error": str(exc),
                    },
                )

            # 4. Parse actual questions instead of treating every
            # non-empty line as a question.
            try:
                from app.questions.models import (
                    LLMQuestionItem,
                    ConfidenceLevel,
                )

                available_pages = sorted(
                    {
                        getattr(chunk, "pageNumber", 0)
                        for chunk in selected_chunks
                    }
                )

                lines = [
                    line.strip()
                    for line in raw_response.splitlines()
                    if line.strip()
                ]

                items = []
                seen_questions = set()

                for line in lines:
                    cleaned = line.strip()

                    # Ignore Markdown headings.
                    if cleaned.startswith("#"):
                        continue

                    # Remove numbering: Q1., Q1:, 1., 1), etc.
                    cleaned = re.sub(
                        r"^\s*(?:Q(?:uestion)?\s*)?\d+\s*[\.\):\-]\s*",
                        "",
                        cleaned,
                        flags=re.IGNORECASE,
                    ).strip()

                    # Ignore common answer options, such as A. or B).
                    if re.match(
                        r"^(?:A|B|C|D|E|F)\s*[\.\)]\s+",
                        cleaned,
                        flags=re.IGNORECASE,
                    ):
                        continue

                    # Remove common difficulty labels, e.g. [C - Easy].
                    cleaned = re.sub(
                        r"^\s*\[[^\]]*(?:easy|medium|hard|beginner|"
                        r"intermediate|advanced)[^\]]*\]\s*",
                        "",
                        cleaned,
                        flags=re.IGNORECASE,
                    ).strip()

                    # Skip empty lines, labels, and explanatory text.
                    if not cleaned or cleaned.endswith(":"):
                        continue

                    # Only accept complete question lines.
                    question_mark = cleaned.find("?")
                    if question_mark == -1:
                        continue

                    question = cleaned[: question_mark + 1].strip()
                    question = question.strip(" \t-*`")

                    if len(question) < 12:
                        continue

                    # Avoid duplicate questions.
                    normalized = re.sub(
                        r"\s+",
                        " ",
                        question.casefold(),
                    )

                    if normalized in seen_questions:
                        continue

                    seen_questions.add(normalized)

                    items.append(
                        LLMQuestionItem(
                            question=question,
                            related_pages=available_pages,
                            confidence=ConfidenceLevel.MEDIUM,
                        )
                    )

                logger.info(
                    "[%s] PARSED: %d question candidates.",
                    request_id,
                    len(items),
                )

                for index, item in enumerate(items, start=1):
                    logger.debug(
                        "[%s] Parsed Q%d: %s",
                        request_id,
                        index,
                        item.question[:200],
                    )

                if not items:
                    logger.warning(
                        "[%s] No complete questions could be extracted.",
                        request_id,
                    )
                    return QuestionGenerationResult(
                        questions=[],
                        metadata={
                            "status": "NO_QUESTIONS_PARSED",
                            "message": (
                                "No complete questions ending with a question "
                                "mark could be extracted from the LLM response."
                            ),
                            "requestId": request_id,
                            "raw_response": raw_response[:1000],
                        },
                    )

            except Exception as exc:
                error_msg = f"Failed to parse LLM output: {exc}"
                logger.exception("[%s] %s", request_id, error_msg)

                return QuestionGenerationResult(
                    questions=[],
                    metadata={
                        "status": "PARSE_FAILED",
                        "message": error_msg,
                        "requestId": request_id,
                        "error": str(exc),
                        "raw_response": raw_response[:1000],
                    },
                )

            # 5. Validate questions against the selected chunks.
            valid_items = self.validator.validate_batch(
                items,
                selected_chunks,
                request_id=request_id,
            )

            logger.info(
                "[%s] Validation complete: %d/%d candidates passed.",
                request_id,
                len(valid_items),
                len(items),
            )

            if not valid_items:
                return QuestionGenerationResult(
                    questions=[],
                    metadata={
                        "status": "VALIDATION_FAILED",
                        "message": (
                            "The generated questions did not pass validation. "
                            "Check the validator logs and LLM response."
                        ),
                        "requestId": request_id,
                        "parsedCount": len(items),
                        "validCount": 0,
                    },
                )

            # 6. Deduplicate questions.
            deduplicated_items = await self.deduplicator.deduplicate(
                valid_items
            )

            # 7. Rank questions and keep the requested count.
            ranked_items = self.ranker.rank(deduplicated_items)
            ranked_items = ranked_items[:count]

            # 8. Format the final result.
            execution_time = (
                time.perf_counter() - start_time
            ) * 1000.0

            result = self.formatter.format(
                items=ranked_items,
                execution_time_ms=execution_time,
                model_used=self.llm_provider.model,
                chunks=selected_chunks,
            )

            logger.info(
                "[%s] Pipeline completed in %.2f ms. Final questions: %d.",
                request_id,
                execution_time,
                len(ranked_items),
            )

            return result

        except Exception as exc:
            logger.exception(
                "[%s] Question-generation pipeline failed: %s",
                request_id,
                exc,
            )

            if isinstance(exc, QuestionGenerationError):
                raise

            raise QuestionGenerationError(
                f"Pipeline execution failed: {exc}"
            ) from exc
