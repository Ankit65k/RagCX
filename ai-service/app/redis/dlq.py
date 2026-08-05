from abc import ABC, abstractmethod
import logging
from redis.asyncio import Redis

from app.schemas.events import BusEvent
from app.redis.serializers import MessageSerializer

logger = logging.getLogger("app")


class DeadLetterQueue(ABC):
    """
    Abstract Base Class for managing Dead Letter Queue (DLQ) operations.
    """

    @abstractmethod
    async def send_to_dlq(self, event: BusEvent, reason: str) -> None:
        """
        Sends a failed processing event to the DLQ.
        """
        pass


class RedisDeadLetterQueue(DeadLetterQueue):
    """
    Concrete Dead Letter Queue routing failed events to Redis lists.
    """

    def __init__(self, redis_client: Redis) -> None:
        self.redis_client = redis_client
        self.dlq_channels = {
            "document": "DOCUMENT_FAILED_DLQ",
            "chat": "CHAT_FAILED_DLQ",
        }

    async def send_to_dlq(self, event: BusEvent, reason: str) -> None:
        # Determine target list
        prefix = "chat" if event.eventType == "CHAT_REQUEST" else "document"
        channel = self.dlq_channels.get(prefix, "DOCUMENT_FAILED_DLQ")

        payload = MessageSerializer.serialize(event)
        
        logger.error(
            f"DLQ: Sending event {event.eventId} (Type: {event.eventType}) to {channel}. Reason: {reason}"
        )

        # Push to Redis List (FIFO queue for DLQ processing)
        await self.redis_client.rpush(channel, payload)
