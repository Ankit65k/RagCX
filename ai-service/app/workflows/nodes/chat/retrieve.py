import logging
import time
from typing import Any, Dict, Optional

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError
from app.retrievers.base import Retriever
from app.memory.manager import MemoryManager
from app.memory.models import MessageRole

logger = logging.getLogger("app")


class RetrieveContextNode(WorkflowNode):
    """
    Appends the user message to memory, loads conversational history,
    and retrieves relevant document chunks for the user query.
    """

    node_name = "retrieve_context"

    def __init__(self, retriever: Retriever, memory_manager: MemoryManager) -> None:
        self.retriever = retriever
        self.memory_manager = memory_manager

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Appending query to memory and retrieving context...")
        retrieval_start = time.perf_counter()
        try:
            query = state["query"]
            conversation_id = state.get("conversation_id")
            top_k: int = state.get("top_k", 5)
            score_threshold: Optional[float] = state.get("score_threshold")
            document_ids = state.get("document_ids", [])  # List of document IDs to filter

            if not conversation_id:
                raise ValueError("conversation_id is missing from state.")

            # 1. Ensure conversation exists, then append USER query
            try:
                await self.memory_manager.load_conversation(conversation_id)
            except Exception:
                await self.memory_manager.create_conversation(conversation_id)

            await self.memory_manager.append_message(conversation_id, MessageRole.USER, query)

            # 2. Retrieve formatted LLM history
            history_messages = await self.memory_manager.retrieve_history(conversation_id)

            # 3. Retrieve context with document filtering
            # Build filter for ChromaDB: if document_ids provided, filter by them
            filter_metadata = None
            if document_ids:
                # Pass list of document IDs to retriever for filtering
                filter_metadata = {"documentIds": document_ids}

            result = await self.retriever.retrieve(
                query=query,
                top_k=top_k,
                score_threshold=score_threshold,
                filter_metadata=filter_metadata,
            )

            retrieval_time_ms = (time.perf_counter() - retrieval_start) * 1000
            logger.info(
                f"[{self.node_name}] Retrieved {len(result.chunks)} chunks "
                f"in {result.processingTimeMs:.1f}ms (total node time: {retrieval_time_ms:.1f}ms)."
            )

            # Warn if no chunks retrieved
            if len(result.chunks) == 0:
                logger.warning(
                    f"[{self.node_name}] WARNING: No chunks retrieved! "
                    f"Possible causes: (1) No documents uploaded, (2) Document filtering excluded all results, "
                    f"(3) Query embedding mismatch with stored vectors."
                )

            # Log chunk details for debugging
            for i, chunk in enumerate(result.chunks):
                logger.info(
                    f"[{self.node_name}] CHUNK {i+1}: documentId={chunk.documentId}, "
                    f"page={chunk.pageNumber}, chunkId={chunk.chunkId}, score={chunk.score:.3f}"
                )
                # Log first 200 chars of content
                content_preview = chunk.text[:200].replace('\n', ' ')
                logger.info(f"[{self.node_name}] CHUNK {i+1} CONTENT: {content_preview}...")

            return {
                "retriever_result": result,
                "history_messages": history_messages,
                "retrieval_time_ms": retrieval_time_ms  # Pass timing for answer node
            }

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
