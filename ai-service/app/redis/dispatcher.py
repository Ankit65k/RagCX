import logging
from typing import Dict, Type, Any
from redis.asyncio import Redis

from app.schemas.events import BusEvent
from app.redis.handlers import (
    BaseHandler,
    DocumentUploadedHandler,
    DocumentReprocessHandler,
    ChatRequestHandler,
    SuggestedQuestionsHandler,
)
from app.chat.handler import ChatEventHandler
from app.core.exceptions import UnknownEventError, HandlerExecutionError

logger = logging.getLogger("app")


class EventDispatcher:
    """
    Event Dispatcher routing validated events to registered callbacks.
    """

    def __init__(self) -> None:
        self.handlers: Dict[str, BaseHandler] = {}

    def register_handler(self, event_type: str, handler: BaseHandler) -> None:
        """
        Registers an event handler instance for a given event type.
        """
        self.handlers[event_type] = handler
        logger.info(f"Dispatcher: Registered handler for {event_type}")

    async def dispatch(self, event: BusEvent) -> None:
        """
        Routes the event payload to its registered handler.
        """
        handler = self.handlers.get(event.eventType)
        if not handler:
            raise UnknownEventError(f"No handler registered for event type: {event.eventType}")

        try:
            logger.info(f"Dispatcher: Dispatching {event.eventType} (ID: {event.eventId})")
            await handler.handle(event)
        except Exception as e:
            raise HandlerExecutionError(
                f"Handler execution failed for {event.eventType} (ID: {event.eventId}). Error: {str(e)}"
            ) from e


class HandlerRegistry:
    """
    Helper bootstrap utility initializing and registering core handlers on startup.
    """

    @staticmethod
    def bootstrap(
        redis_client: Redis,
        chat_event_handler: ChatEventHandler,
        vector_store: Any,
        question_generation_pipeline: Any,
        document_processor: Any,
        embedding_service: Any,
    ) -> EventDispatcher:
        dispatcher = EventDispatcher()

        # Instantiate and register handlers
        dispatcher.register_handler(
            "DOCUMENT_UPLOADED",
            DocumentUploadedHandler(
                redis_client,
                document_processor,
                embedding_service,
                vector_store,
            ),
        )
        dispatcher.register_handler(
            "DOCUMENT_REPROCESS_REQUESTED",
            DocumentReprocessHandler(
                redis_client,
                document_processor,
                embedding_service,
                vector_store,
            ),
        )
        dispatcher.register_handler(
            "CHAT_REQUEST",
            ChatRequestHandler(redis_client, chat_event_handler),
        )
        dispatcher.register_handler(
            "SUGGESTED_QUESTIONS_REQUEST",
            SuggestedQuestionsHandler(
                redis_client,
                vector_store,
                question_generation_pipeline,
            ),
        )

        return dispatcher
