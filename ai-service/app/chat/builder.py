import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.chat.models import ChatEventRequest, ChatEventResponse, ChatResponsePayload

logger = logging.getLogger("app")


class ResponseBuilder:
    """
    Builds structured CHAT_RESPONSE events, populating timing, metadata,
    and fallback values where appropriate.
    """

    def build_response(
        self,
        request: ChatEventRequest,
        answer: str,
        confidence: str,
        citations: List[Dict[str, Any]],
        execution_time_ms: float,
        model: str,
        retrieved_chunks: Optional[List[Dict[str, Any]]] = None,
        token_usage: Optional[Dict[str, int]] = None,
    ) -> ChatEventResponse:
        logger.info(f"ResponseBuilder: Building chat response for session {request.conversationId}")

        # Map citation and chunk metrics
        sources = []
        for cit in citations:
            sources.append({
                "documentId": cit.get("documentId"),
                "page": cit.get("page"),
                "chunkId": cit.get("chunkId")
            })

        payload = ChatResponsePayload(
            conversationId=request.conversationId,
            answer=answer,
            sources=sources,
            confidence=confidence,
            executionTime=round(execution_time_ms, 2),
            model=model,
            tokenUsage=token_usage or {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
        )

        response_event = ChatEventResponse(
            eventId=str(uuid.uuid4()),
            eventType="CHAT_RESPONSE",
            version="1.0",
            timestamp=datetime.utcnow(),
            correlationId=request.correlationId,
            requestId=request.requestId,
            payload=payload
        )

        return response_event

    def build_error_response(
        self,
        request: ChatEventRequest,
        error_msg: str,
        execution_time_ms: float,
    ) -> ChatEventResponse:
        """
        Creates a clean fallback/error response.
        Provides user-friendly messages based on error type.
        """
        # Determine user-friendly message based on error
        error_lower = error_msg.lower()
        if "no documents" in error_lower or "empty" in error_lower or "not found" in error_lower:
            user_message = "No documents have been uploaded yet. Please upload documents first to start chatting."
        elif "timeout" in error_lower or "took too long" in error_lower:
            user_message = "The request took too long. Please try again with a shorter question."
        elif "connection" in error_lower or "unavailable" in error_lower:
            user_message = "Unable to connect to the AI service. Please ensure all services are running."
        elif "json" in error_lower or "parsing" in error_lower or "validation" in error_lower:
            user_message = "Error processing response. Please try again."
            logger.error(f"ResponseBuilder: JSON/Validation error - Full details: {error_msg}")
        else:
            user_message = "I encountered an error processing your request. Please try again."
            logger.error(f"ResponseBuilder: Unexpected error - Full details: {error_msg}")

        payload = ChatResponsePayload(
            conversationId=request.conversationId,
            answer=user_message,
            sources=[],
            confidence="LOW",
            executionTime=round(execution_time_ms, 2),
            model="unknown",
            tokenUsage={"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
        )

        return ChatEventResponse(
            eventId=str(uuid.uuid4()),
            eventType="CHAT_RESPONSE",
            version="1.0",
            timestamp=datetime.utcnow(),
            correlationId=request.correlationId,
            requestId=request.requestId,
            payload=payload
        )
