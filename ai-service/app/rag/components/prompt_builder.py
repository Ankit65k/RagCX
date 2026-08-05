import logging
from typing import Dict, List, Optional

from app.rag.templates import RAGPromptTemplate
from app.rag.exceptions import PromptError
from app.retrievers.models import RetrievedChunk

logger = logging.getLogger("app")

_FALLBACK_CONTEXT = "No relevant context was retrieved for this question."


class PromptBuilder:
    """
    Assembles the final LLM prompt from ranked chunks and the user question.

    Delegates all template rendering to RAGPromptTemplate — this class
    only orchestrates data transformation (chunks → context string → messages).

    Never concatenates strings manually. Each context block is rendered via
    a PromptTemplate that preserves document metadata for traceable answers.
    """

    def build(
        self,
        question: str,
        chunks: List[RetrievedChunk],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        """
        Returns a list of message dicts ready for OllamaProvider.chat().

        Args:
            question:             Normalised user question.
            chunks:               Ranked context chunks (may be empty → fallback).
            conversation_history: Optional prior conversation turns.

        Returns:
            List[Dict[str, str]] — [{"role": ..., "content": ...}, ...]
        """
        try:
            if chunks:
                context_blocks = [
                    RAGPromptTemplate.render_context_block(
                        document_id=chunk.documentId,
                        chunk_id=chunk.chunkId,
                        page_number=chunk.pageNumber,
                        score=chunk.score,
                        text=chunk.text,
                    )
                    for chunk in chunks
                ]
                context = "\n\n---\n\n".join(context_blocks)
            else:
                context = _FALLBACK_CONTEXT

            messages = RAGPromptTemplate.build(
                context=context,
                question=question,
                conversation_history=conversation_history,
            )

            logger.info(
                f"PromptBuilder: Built prompt with {len(chunks)} context chunks "
                f"({sum(len(c.text) for c in chunks)} chars of context)."
            )
            return messages

        except Exception as e:
            raise PromptError(f"Failed to assemble prompt: {str(e)}") from e
