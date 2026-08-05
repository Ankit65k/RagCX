import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError
from app.vector_store.base import VectorStore

logger = logging.getLogger("app")


class StoreVectorsNode(WorkflowNode):
    """
    Persists the EmbeddingResult from the previous node into the Vector Store.
    Sets state["vectors_stored"] = True on success.
    """

    node_name = "store_vectors"

    def __init__(self, vector_store: VectorStore) -> None:
        self.vector_store = vector_store

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Storing vectors in Vector Store...")
        try:
            embedding_result = state.get("embedding_result")
            if not embedding_result:
                raise ValueError("embedding_result is missing from state — cannot store vectors.")

            await self.vector_store.insert_embeddings(embedding_result)
            logger.info(
                f"[{self.node_name}] Stored {len(embedding_result.embeddings)} vectors "
                f"for document '{state.get('document_id', 'unknown')}'."
            )
            return {"vectors_stored": True}

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
