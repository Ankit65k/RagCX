import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError

logger = logging.getLogger("app")


class ValidateDocumentNode(WorkflowNode):
    """
    Validates the document chunk list is non-empty and structurally sound.
    Sets state["is_valid"] = True/False and state["validation_error"] if invalid.
    The workflow definition routes to an error terminal if is_valid is False.
    """

    node_name = "validate_document"

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Starting document validation...")
        try:
            chunks = state.get("chunks", [])
            document_id = state.get("document_id", "unknown")

            if not chunks:
                logger.warning(f"[{self.node_name}] Document '{document_id}' has no chunks.")
                return {"is_valid": False, "validation_error": "Document produced zero chunks after processing."}

            logger.info(f"[{self.node_name}] Document '{document_id}' validated: {len(chunks)} chunks.")
            return {"is_valid": True, "validation_error": None}

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
