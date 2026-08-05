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
        top_k = request.metadata.get("top_k", 5)
        score_threshold = request.metadata.get("score_threshold")
        document_id = request.metadata.get("documentId") # scope to specific doc if passed

        return {
            "query": request.question,
            "conversation_id": request.conversationId,
            "document_id": document_id,
            "top_k": top_k,
            "score_threshold": score_threshold,
        }
