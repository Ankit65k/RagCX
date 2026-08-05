import logging
from typing import Dict, Any, Optional
from app.memory.manager import MemoryManager
from app.memory.models import ConversationState, MessageRole
from app.chat.exceptions import ConversationError

logger = logging.getLogger("app")


class ConversationManager:
    """
    Manages loading and initialization of conversation state.
    """

    def __init__(self, memory_manager: MemoryManager) -> None:
        self.memory_manager = memory_manager

    async def get_or_create_conversation(self, conversation_id: str, metadata: Optional[Dict[str, Any]] = None) -> ConversationState:
        logger.info(f"ConversationManager: Retrieving conversation session: {conversation_id}")
        try:
            # Try to load existing session
            return await self.memory_manager.load_conversation(conversation_id)
        except Exception:
            logger.info(f"ConversationManager: Session {conversation_id} not found. Creating new session.")
            try:
                return await self.memory_manager.create_conversation(
                    conversation_id=conversation_id,
                    metadata=metadata
                )
            except Exception as e:
                logger.error(f"ConversationManager: Failed to create session {conversation_id}. Error: {str(e)}")
                raise ConversationError(f"Failed to create conversation: {str(e)}") from e
