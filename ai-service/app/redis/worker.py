import asyncio
import logging
from typing import List
from redis.asyncio import Redis
from redis.asyncio.client import PubSub

from app.core.config.settings import settings
from app.redis.dispatcher import EventDispatcher
from app.redis.serializers import MessageSerializer, MessageValidator
from app.redis.dlq import RedisDeadLetterQueue
from app.core.exceptions import (
    UnknownEventError,
    MessageValidationError,
    InvalidEventError,
    HandlerExecutionError,
)

logger = logging.getLogger("app")


class RedisWorker:
    """
    Redis Worker subscription listener.
    Runs the event processing loop, handles connection drops with automatic
    exponential backoff reconnections, and processes messages concurrently.
    """

    def __init__(self, redis_client: Redis, dispatcher: EventDispatcher) -> None:
        self.redis_client = redis_client
        self.dispatcher = dispatcher
        self.dlq = RedisDeadLetterQueue(redis_client)
        self.channels: List[str] = ["document:jobs", "chat:jobs"]
        
        self._running = False
        self._pubsub: PubSub | None = None
        self._listener_task: asyncio.Task | None = None

    async def start(self) -> None:
        """
        Starts the worker listener loop.
        """
        self._running = True
        logger.info(f"Worker: Starting Redis Worker. Subscribing to: {self.channels}")
        self._listener_task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        """
        Triggers a graceful shutdown, cancelling listening tasks and closing resources.
        """
        logger.info("Worker: Graceful shutdown initiated. Stopping loop...")
        self._running = False
        
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None

        if self._pubsub:
            await self._pubsub.unsubscribe()
            await self._pubsub.close()
            self._pubsub = None

        logger.info("Worker: Shutdown sequence complete. Worker stopped.")

    async def _run_loop(self) -> None:
        """
        Internal listening loop with connection recovery guards.
        """
        retry_delay = 1.0
        max_delay = 60.0

        while self._running:
            try:
                # 1. Connect and Subscribe
                self._pubsub = self.redis_client.pubsub()
                await self._pubsub.subscribe(*self.channels)
                logger.info("Worker: Redis connected and channels subscribed successfully.")
                
                # Reset reconnect delay on successful connection
                retry_delay = 1.0

                # 2. Process message loop
                while self._running:
                    # Non-blocking get_message polling with small timeout
                    message = await self._pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=0.1,
                    )
                    
                    if message and message.get("type") == "message":
                        raw_data = message.get("data")
                        if isinstance(raw_data, bytes):
                            raw_data = raw_data.decode("utf-8")
                        if isinstance(raw_data, str):
                            # Dispatch asynchronously to avoid blocking the main subscription queue
                            asyncio.create_task(self._process_message(raw_data))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    f"Worker: Connection lost or subscription failed. Retrying in {retry_delay}s. Error: {str(e)}"
                )
                
                # Clean connections
                if self._pubsub:
                    try:
                        await self._pubsub.close()
                    except Exception:
                        pass
                    self._pubsub = None

                # Exponential backoff retry logic
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_delay)

    async def _process_message(self, raw_data: str) -> None:
        """
        Deserializes, validates, and dispatches a single message event.
        Routes to DLQ if processing/validation errors occur.
        """
        event = None
        try:
            # 1. Deserialize message
            event = MessageSerializer.deserialize(raw_data)

            # 2. Validate envelope
            MessageValidator.validate_envelope(event)

            # 3. Filter out response events (these are for backend, not AI service)
            response_event_types = {
                "DOCUMENT_PROCESSING_STARTED",
                "DOCUMENT_PROCESSING_COMPLETED",
                "DOCUMENT_PROCESSING_FAILED",
                "SUGGESTED_QUESTIONS_RESPONSE",
                "SUGGESTED_QUESTIONS_ERROR",
                "CHAT_RESPONSE",
                "CHAT_ERROR"
            }

            if event.eventType in response_event_types:
                # Silently ignore response events - they're meant for backend
                logger.debug(f"Worker: Ignoring response event {event.eventType} (meant for backend)")
                return

            # 4. Dispatch to handler
            await self.dispatcher.dispatch(event)

        except (MessageValidationError, InvalidEventError) as val_err:
            logger.error(f"Worker: Message validation rejected. Error: {str(val_err)}")
            if event:
                await self.dlq.send_to_dlq(event, reason=f"Validation failed: {str(val_err)}")

        except UnknownEventError as e:
            logger.warn(f"Worker: Unrecognized event. {str(e)}")
            if event:
                await self.dlq.send_to_dlq(event, reason=str(e))

        except HandlerExecutionError as handler_err:
            logger.error(f"Worker: Handler processing failed. Error: {str(handler_err)}")
            if event:
                await self.dlq.send_to_dlq(event, reason=str(handler_err))

        except Exception as general_err:
            logger.critical(f"Worker: Unexpected system processing failure. Error: {str(general_err)}")
            if event:
                await self.dlq.send_to_dlq(event, reason=f"General failure: {str(general_err)}")
