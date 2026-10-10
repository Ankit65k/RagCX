import logging
from typing import Dict, Any
from app.chat.models import ChatEventRequest

logger = logging.getLogger("app")


class ChatContextBuilder:
    """
    Builds the workflow state payload and metadata context based on
    incoming chat request events.
    """

    def build_workflow_state(self, request: ChatEventRequest) -> Dict[str, Any]:
        """
        Maps ChatEventRequest fields into the initial ChatWorkflowState dict.
        """
        logger.debug(f"ChatContextBuilder: Mapping workflow state for req {request.requestId}")

        # Pull optional parameters from request metadata, or fall back to defaults
        top_k = request.metadata.get("top_k", 3)  # Reduced from 5 to 3 for faster processing
        score_threshold = request.metadata.get("score_threshold")
        document_ids = request.documentIds  # Use the new documentIds field from request

        return {
            "query": request.question,
            "conversation_id": request.conversationId,
            "document_ids": document_ids,  # Pass array of document IDs
            "top_k": top_k,
            "score_threshold": score_threshold,
        }
