import logging
from abc import ABC, abstractmethod
from redis.asyncio import Redis
from app.chat.models import ChatEventResponse
from app.chat.exceptions import ResponsePublishError
from app.redis.serializers import MessageSerializer
from app.schemas.events import BusEvent

logger = logging.getLogger("app")


class BaseResponsePublisher(ABC):
    """
    Abstract interface for publishing chat responses back to the event bus.
    """

    @abstractmethod
    async def publish(self, response: ChatEventResponse, channel: str = "chat:jobs") -> None:
        """Publishes the chat response event."""
        pass


class ResponsePublisher(BaseResponsePublisher):
    """
    Concrete implementation of BaseResponsePublisher using Redis Pub/Sub.
    """

    def __init__(self, redis_client: Redis) -> None:
        self.redis_client = redis_client

    async def publish(self, response: ChatEventResponse, channel: str = "chat:jobs") -> None:
        logger.info(f"ResponsePublisher: Publishing CHAT_RESPONSE for req {response.requestId} on channel {channel}")
        try:
            # We map ChatEventResponse back to a BusEvent envelope for standard bus serialization
            payload_dict = response.payload.model_dump()
            
            # Pydantic serialization helper
            bus_event = BusEvent(
                eventId=response.eventId,
                eventType=response.eventType,
                version=response.version,
                timestamp=response.timestamp.isoformat() if isinstance(response.timestamp, datetime) else str(response.timestamp),
                correlationId=response.correlationId,
                requestId=response.requestId,
                producer="ragcx-ai-service",
                payload=payload_dict,
                metadata={}
            )
            
            serialized = MessageSerializer.serialize(bus_event)
            await self.redis_client.publish(channel, serialized)
            logger.info(f"ResponsePublisher: Successfully published response event {response.eventId}")
        except Exception as e:
            logger.error(f"ResponsePublisher: Failed publishing response event. Error: {str(e)}")
            raise ResponsePublishError(f"Failed to publish response to Redis: {str(e)}") from e


# Ensure datetime is imported for string conversions
from datetime import datetime
