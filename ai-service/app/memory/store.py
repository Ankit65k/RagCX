import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Optional
from app.memory.models import ConversationState
from app.memory.exceptions import ConversationNotFoundError

logger = logging.getLogger("app")


class BaseConversationStore(ABC):
    """
    Abstract Interface for Conversation Stores (Redis, PostgreSQL, MongoDB, InMemory).
    """

    @abstractmethod
    async def create(self, conversation_id: str, initial_state: ConversationState) -> None:
        """Create a new conversation session."""
        pass

    @abstractmethod
    async def read(self, conversation_id: str) -> ConversationState:
        """Read a conversation session. Raises ConversationNotFoundError if not exists."""
        pass

    @abstractmethod
    async def update(self, conversation_id: str, state: ConversationState) -> None:
        """Update a conversation session."""
        pass

    @abstractmethod
    async def delete(self, conversation_id: str) -> None:
        """Delete a conversation session."""
        pass

    @abstractmethod
    async def exists(self, conversation_id: str) -> bool:
        """Check if a conversation session exists."""
        pass


class InMemoryConversationStore(BaseConversationStore):
    """
    Thread-safe, async-first in-memory implementation of BaseConversationStore.
    """

    def __init__(self) -> None:
        self._storage: Dict[str, ConversationState] = {}
        self._lock = asyncio.Lock()

    async def create(self, conversation_id: str, initial_state: ConversationState) -> None:
        async with self._lock:
            self._storage[conversation_id] = initial_state
            logger.info(f"InMemoryStore: Created conversation ID {conversation_id}")

    async def read(self, conversation_id: str) -> ConversationState:
        async with self._lock:
            if conversation_id not in self._storage:
                raise ConversationNotFoundError(f"Conversation ID '{conversation_id}' not found.")
            return self._storage[conversation_id]

    async def update(self, conversation_id: str, state: ConversationState) -> None:
        async with self._lock:
            if conversation_id not in self._storage:
                raise ConversationNotFoundError(f"Conversation ID '{conversation_id}' not found during update.")
            self._storage[conversation_id] = state
            logger.debug(f"InMemoryStore: Updated conversation ID {conversation_id}")

    async def delete(self, conversation_id: str) -> None:
        async with self._lock:
            if conversation_id not in self._storage:
                raise ConversationNotFoundError(f"Conversation ID '{conversation_id}' not found during deletion.")
            del self._storage[conversation_id]
            logger.info(f"InMemoryStore: Deleted conversation ID {conversation_id}")

    async def exists(self, conversation_id: str) -> bool:
        async with self._lock:
            return conversation_id in self._storage
