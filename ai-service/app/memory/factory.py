from typing import Optional
from app.models.base import LLMProvider
from app.memory.store import BaseConversationStore, InMemoryConversationStore
from app.memory.components.context_window import ContextWindowManager
from app.memory.components.summarizer import ConversationSummarizer
from app.memory.components.history import HistoryManager
from app.memory.manager import MemoryManager


class MemoryFactory:
    """
    Factory to simplify and standardize the creation of the Conversation Memory Layer.
    """

    @staticmethod
    def create_memory_manager(
        store: Optional[BaseConversationStore] = None,
        llm_provider: Optional[LLMProvider] = None,
        max_messages: int = 20,
        max_tokens: int = 4000,
        max_characters: int = 16000,
    ) -> MemoryManager:
        # 1. Resolve storage back-end (default to InMemoryConversationStore)
        resolved_store = store or InMemoryConversationStore()

        # 2. Instantiate component managers
        context_manager = ContextWindowManager(
            max_messages=max_messages,
            max_tokens=max_tokens,
            max_characters=max_characters,
        )
        summarizer = ConversationSummarizer(llm_provider=llm_provider)
        history_manager = HistoryManager()

        # 3. Assemble and return facade orchestrator
        return MemoryManager(
            store=resolved_store,
            context_manager=context_manager,
            summarizer=summarizer,
            history_manager=history_manager,
        )
