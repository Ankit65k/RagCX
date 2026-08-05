import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError
from app.embeddings.service import EmbeddingService

logger = logging.getLogger("app")


class GenerateEmbeddingNode(WorkflowNode):
    """
    Converts document chunks into vector embeddings via the EmbeddingService.
    Stores the EmbeddingResult in state["embedding_result"].
    """

    node_name = "generate_embeddings"

    def __init__(self, embedding_service: EmbeddingService) -> None:
        self.embedding_service = embedding_service

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Generating embeddings...")
        try:
            chunks = state["chunks"]
            document_id = state.get("document_id", "unknown")

            embedding_result = await self.embedding_service.embed_chunks(
                chunks=chunks,
                document_id=document_id,
            )

            logger.info(
                f"[{self.node_name}] Generated {len(embedding_result.embeddings)} vectors "
                f"in {embedding_result.statistics.processingTimeMs:.1f}ms."
            )
            return {"embedding_result": embedding_result}

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
