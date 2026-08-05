import json
import logging
import time
from typing import Optional

from app.core.config.settings import settings
from app.models.base import LLMProvider
from app.retrievers.base import Retriever
from app.rag.exceptions import PipelineExecutionError, RetrievalError, GenerationError, ValidationError
from app.rag.models import PipelineRequest, PipelineResult, LLMStructuredResponse, CitationItem
from app.rag.components.query_validator import QueryValidator
from app.rag.components.query_normalizer import QueryNormalizer
from app.rag.components.context_ranker import ContextRanker
from app.rag.components.prompt_builder import PromptBuilder
from app.rag.components.answer_validator import AnswerValidator
from app.rag.components.citation_builder import CitationBuilder
from app.rag.components.response_formatter import ResponseFormatter

logger = logging.getLogger("app")

_FALLBACK_ANSWER = "No relevant information found."


class RAGPipeline:
    """
    RAGPipeline orchestrates the entire Retrieval-Augmented Generation process.

    This pipeline coordinates:
        1. Query Validation & Normalisation
        2. Vector Search (via Retriever)
        3. Context Re-ranking & Budgeting
        4. Prompt Assembly (System + Context + Question)
        5. LLM Answer Generation (Structured JSON output format)
        6. Response Parsing & Pydantic Validation
        7. Citations & Output Formatting
    """

    def __init__(
        self,
        retriever: Retriever,
        llm_provider: LLMProvider,
        query_validator: QueryValidator,
        query_normalizer: QueryNormalizer,
        context_ranker: ContextRanker,
        prompt_builder: PromptBuilder,
        answer_validator: AnswerValidator,
        citation_builder: CitationBuilder,
        response_formatter: ResponseFormatter,
    ) -> None:
        self.retriever = retriever
        self.llm_provider = llm_provider
        self.query_validator = query_validator
        self.query_normalizer = query_normalizer
        self.context_ranker = context_ranker
        self.prompt_builder = prompt_builder
        self.answer_validator = answer_validator
        self.citation_builder = citation_builder
        self.response_formatter = response_formatter

    async def run(self, request: PipelineRequest) -> PipelineResult:
        start_time = time.perf_counter()
        logger.info("RAGPipeline: Execution started.")

        try:
            # 1. Validation & Normalisation
            self.query_validator.validate(request.query)
            normalized_query = self.query_normalizer.normalize(request.query)

            # 2. Context Retrieval
            logger.info("RAGPipeline: Retrieval started.")
            try:
                filter_metadata = {"documentId": request.documentId} if request.documentId else None
                retrieval_result = await self.retriever.retrieve(
                    query=normalized_query,
                    top_k=request.topK,
                    score_threshold=request.scoreThreshold,
                    filter_metadata=filter_metadata,
                )
                retrieved_chunks = retrieval_result.chunks
                logger.info(f"RAGPipeline: Retrieval completed. Retrieved {len(retrieved_chunks)} candidate chunks.")
            except Exception as e:
                logger.error(f"RAGPipeline: Retrieval failed: {str(e)}")
                raise RetrievalError(f"Retrieval step failed: {str(e)}") from e

            # If no context returned, trigger fallback strategy directly
            if not retrieved_chunks:
                logger.info("RAGPipeline: No context found. Triggering fallback answer.")
                execution_time = (time.perf_counter() - start_time) * 1000.0
                return self.response_formatter.format_response(
                    answer=_FALLBACK_ANSWER,
                    citations=[],
                    chunks=[],
                    execution_time_ms=execution_time,
                    model_used=self.llm_provider.model,
                    max_context_chunks=self.context_ranker.max_context_chunks,
                    is_fallback=True,
                )

            # 3. Context Re-ranking
            ranked_chunks = self.context_ranker.rank(retrieved_chunks)

            # 4. Prompt Assembly
            messages = self.prompt_builder.build(
                question=normalized_query,
                chunks=ranked_chunks,
                conversation_history=request.conversationHistory,
            )

            # 5. Generation
            logger.info("RAGPipeline: Generation started (Structured JSON format).")
            try:
                raw_response = await self.llm_provider.chat(messages, format="json")
                raw_response = raw_response.strip()
                logger.info("RAGPipeline: Generation completed.")
            except Exception as e:
                logger.error(f"RAGPipeline: LLM generation failed: {str(e)}")
                raise GenerationError(f"LLM generation failed: {str(e)}") from e

            # 6. Parse and Validate Structured JSON Response
            try:
                structured = LLMStructuredResponse.model_validate_json(raw_response)
                answer = structured.answer
                is_fallback = _FALLBACK_ANSWER.lower() in answer.lower()
                logger.info(f"RAGPipeline: Structured response parsed successfully. Confidence: {structured.confidence}")
            except Exception as e:
                logger.error(f"RAGPipeline: JSON parsing or validation failed: {str(e)}")
                raise ValidationError("llm_response", f"LLM response failed schema validation: {str(e)}") from e

            # 7. Answer Validation
            self.answer_validator.validate(answer)
            logger.info("RAGPipeline: Validation completed.")

            # 8. Citations & Formatting
            doc_id_to_filename = {}
            for chunk in ranked_chunks:
                metadata = chunk.metadata or {}
                filename = metadata.get("filename") or metadata.get("source") or "unknown_document"
                doc_id_to_filename[chunk.documentId] = filename

            citations = []
            if not is_fallback:
                for cit in structured.citations:
                    matched_chunk = next((c for c in ranked_chunks if c.chunkId == cit.chunkId), None)
                    if matched_chunk:
                        filename = (matched_chunk.metadata or {}).get("filename") or (matched_chunk.metadata or {}).get("source") or "unknown_document"
                        score = matched_chunk.score
                    else:
                        filename = doc_id_to_filename.get(cit.documentId, "unknown_document")
                        score = 1.0

                    citations.append(
                        CitationItem(
                            documentId=cit.documentId,
                            filename=filename,
                            pageNumber=cit.page,
                            chunkId=cit.chunkId,
                            score=score,
                        )
                    )

            execution_time = (time.perf_counter() - start_time) * 1000.0

            result = self.response_formatter.format_response(
                answer=answer,
                citations=citations,
                chunks=ranked_chunks if not is_fallback else [],
                execution_time_ms=execution_time,
                model_used=self.llm_provider.model,
                max_context_chunks=self.context_ranker.max_context_chunks,
                is_fallback=is_fallback,
            )

            logger.info(f"RAGPipeline: Pipeline completed successfully in {execution_time:.2f}ms.")
            return result

        except Exception as e:
            if not isinstance(e, (RetrievalError, GenerationError, ValidationError)):
                logger.error(f"RAGPipeline: Unhandled exception: {str(e)}", exc_info=True)
                raise PipelineExecutionError(f"Pipeline failed: {str(e)}") from e
            raise
