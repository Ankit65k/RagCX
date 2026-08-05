import logging
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
        try:
            query = state["query"]
            conversation_id = state.get("conversation_id")
            top_k: int = state.get("top_k", 5)
            score_threshold: Optional[float] = state.get("score_threshold")
            document_id: Optional[str] = state.get("document_id")

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

            # 3. Retrieve context
            filter_metadata = {"documentId": document_id} if document_id else None
            result = await self.retriever.retrieve(
                query=query,
                top_k=top_k,
                score_threshold=score_threshold,
                filter_metadata=filter_metadata,
            )

            logger.info(
                f"[{self.node_name}] Retrieved {len(result.chunks)} chunks "
                f"in {result.processingTimeMs:.1f}ms."
            )
            return {
                "retriever_result": result,
                "history_messages": history_messages
            }

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
