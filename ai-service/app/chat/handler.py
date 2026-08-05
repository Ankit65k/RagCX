import logging
from typing import Dict, Any
from datetime import datetime

from app.schemas.events import BusEvent
from app.chat.models import ChatEventRequest
from app.chat.pipeline import ChatPipeline
from app.chat.exceptions import ChatPipelineError

logger = logging.getLogger("app")


class ChatEventHandler:
    """
    Entrypoint handler validating event schemas and orchestrating execution.
    """

    def __init__(self, pipeline: ChatPipeline) -> None:
        self.pipeline = pipeline

    async def handle_event(self, event: BusEvent) -> None:
        logger.info(f"ChatEventHandler: Handling event {event.eventId} (Type: {event.eventType})")
        
        # 1. Reject malformed payloads or non-chat event types
        if event.eventType != "CHAT_REQUEST":
            logger.warning(f"ChatEventHandler: Ignored unsupported event type: {event.eventType}")
            return

        try:
            # 2. Extract and validate request parameters
            payload = event.payload
            chat_session_id = payload.get("chatSessionId")
            question = payload.get("prompt")
            
            if not chat_session_id or not question:
                logger.error(f"ChatEventHandler: Missing session ID or query in event payload: {payload}")
                raise ChatPipelineError("Malformed payload: chatSessionId and prompt are required.")

            # Map user ID if present in metadata
            user_id = event.metadata.get("userId", "default-user")

            request = ChatEventRequest(
                eventId=event.eventId,
                requestId=event.requestId,
                correlationId=event.correlationId,
                conversationId=chat_session_id,
                userId=user_id,
                question=question,
                timestamp=datetime.utcnow(),
                metadata=event.metadata
            )

            # 3. Invoke Pipeline Execution
            result = await self.pipeline.execute(request)
            
            if result.success:
                logger.info(f"ChatEventHandler: Processed event {event.eventId} successfully.")
            else:
                logger.error(f"ChatEventHandler: Finished event processing with errors: {result.error_message}")

        except Exception as e:
            logger.error(f"ChatEventHandler: Exception handling event {event.eventId}. Error: {str(e)}")
            # Do not re-raise to prevent worker process crashes (handled inside pipeline fallback)
