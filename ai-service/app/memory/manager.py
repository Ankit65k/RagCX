import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.memory.models import Message, MessageRole, ConversationState
from app.memory.store import BaseConversationStore
from app.memory.components.context_window import ContextWindowManager
from app.memory.components.summarizer import ConversationSummarizer
from app.memory.components.history import HistoryManager
from app.memory.exceptions import InvalidConversationError

logger = logging.getLogger("app")


class MemoryManager:
    """
    Main memory orchestrator coordinating short-term context storage,
    context limit enforcement (trimming), and rolling summary generation.
    """

    def __init__(
        self,
        store: BaseConversationStore,
        context_manager: ContextWindowManager,
        summarizer: ConversationSummarizer,
        history_manager: HistoryManager,
    ) -> None:
        self.store = store
        self.context_manager = context_manager
        self.summarizer = summarizer
        self.history_manager = history_manager

    async def create_conversation(self, conversation_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> ConversationState:
        cid = conversation_id or f"c-{uuid.uuid4().hex[:12]}"
        
        # Check uniqueness if user provides ID
        if conversation_id and await self.store.exists(conversation_id):
            raise InvalidConversationError(f"Conversation ID '{conversation_id}' already exists.")

        initial_state = ConversationState(
            conversationId=cid,
            messages=[],
            createdTime=datetime.utcnow(),
            updatedTime=datetime.utcnow(),
            metadata=metadata or {},
        )
        
        await self.store.create(cid, initial_state)
        logger.info(f"MemoryManager: Conversation Created (ID: {cid})")
        return initial_state

    async def load_conversation(self, conversation_id: str) -> ConversationState:
        return await self.store.read(conversation_id)

    async def append_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ConversationState:
        # 1. Load conversation state
        state = await self.store.read(conversation_id)

        # 2. Estimate token count and build Message
        token_count = self.context_manager.estimate_tokens(content)
        msg_id = f"m-{uuid.uuid4().hex[:8]}"
        message = Message(
            messageId=msg_id,
            conversationId=conversation_id,
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            tokenCount=token_count,
            metadata=metadata or {},
        )

        # 3. Append to sequence
        state.messages.append(message)
        state.updatedTime = datetime.utcnow()

        # Update last messages cache
        if role == MessageRole.USER:
            state.lastUserMessage = content
        elif role == MessageRole.ASSISTANT:
            state.lastAssistantMessage = content

        logger.info(f"MemoryManager: Message Added (ID: {msg_id}) to conversation {conversation_id}")

        # 4. Check context window limits and trigger summarization if necessary
        if self.context_manager.needs_trimming(state.messages):
            trim_index = self.context_manager.get_trim_index(state.messages)
            if trim_index > 0:
                messages_to_summarize = state.messages[:trim_index]
                messages_to_keep = state.messages[trim_index:]

                # Update the running summary
                updated_summary = await self.summarizer.summarize(
                    messages=messages_to_summarize,
                    existing_summary=state.summary,
                )

                state.summary = updated_summary
                state.messages = messages_to_keep
                logger.info(f"MemoryManager: History Trimmed. Summarized {trim_index} oldest messages.")

        # 5. Persist updated state
        await self.store.update(conversation_id, state)
        return state

    async def retrieve_history(self, conversation_id: str) -> List[Dict[str, str]]:
        state = await self.store.read(conversation_id)
        return self.history_manager.format_history_for_llm(state.messages, state.summary)

    async def clear_conversation(self, conversation_id: str) -> ConversationState:
        state = await self.store.read(conversation_id)
        state.messages = []
        state.summary = None
        state.lastUserMessage = None
        state.lastAssistantMessage = None
        state.updatedTime = datetime.utcnow()

        await self.store.update(conversation_id, state)
        logger.info(f"MemoryManager: Conversation cleared for ID {conversation_id}")
        return state

    async def delete_conversation(self, conversation_id: str) -> None:
        await self.store.delete(conversation_id)
        logger.info(f"MemoryManager: Conversation Deleted (ID: {conversation_id})")
