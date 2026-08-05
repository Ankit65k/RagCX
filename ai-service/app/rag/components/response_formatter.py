import logging
import time
from typing import List

from app.rag.models import (
    ConfidenceLevel,
    ConfidenceScore,
    PipelineResult,
    CitationItem,
)
from app.retrievers.models import RetrievedChunk

logger = logging.getLogger("app")


class ResponseFormatter:
    """
    Computes confidence metrics and formats the final pipeline response.

    Confidence Score Logic:
        • level:
            - HIGH: Avg similarity >= 0.7 and chunk count >= 3
            - MEDIUM: Avg similarity >= 0.5 (or count >= 1)
            - LOW: Otherwise or when no context/fallback is active
    """

    def format_response(
        self,
        answer: str,
        citations: List[CitationItem],
        chunks: List[RetrievedChunk],
        execution_time_ms: float,
        model_used: str,
        max_context_chunks: int,
        is_fallback: bool = False,
    ) -> PipelineResult:
        if is_fallback or not chunks:
            confidence = ConfidenceScore(
                level=ConfidenceLevel.LOW,
                averageSimilarity=0.0,
                chunkCount=0,
                contextCoverage=0.0,
            )
            return PipelineResult(
                answer=answer,
                sources=[],
                confidence=confidence,
                chunks=[],
                executionTimeMs=execution_time_ms,
                modelUsed=model_used,
                isFallback=True,
            )

        # Calculate metrics
        total_score = sum(c.score for c in chunks)
        avg_similarity = total_score / len(chunks) if chunks else 0.0
        coverage = len(chunks) / max_context_chunks if max_context_chunks > 0 else 1.0

        # Heuristic rules to assign confidence level
        if avg_similarity >= 0.7 and len(chunks) >= 3:
            level = ConfidenceLevel.HIGH
        elif avg_similarity >= 0.5:
            level = ConfidenceLevel.MEDIUM
        else:
            level = ConfidenceLevel.LOW

        confidence = ConfidenceScore(
            level=level,
            averageSimilarity=round(avg_similarity, 4),
            chunkCount=len(chunks),
            contextCoverage=round(coverage, 2),
        )

        return PipelineResult(
            answer=answer,
            sources=citations,
            confidence=confidence,
            chunks=chunks,
            executionTimeMs=execution_time_ms,
            modelUsed=model_used,
            isFallback=False,
        )
