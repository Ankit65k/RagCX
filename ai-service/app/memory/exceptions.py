class ConversationMemoryError(Exception):
    """Base exception class for all conversation memory layer errors."""
    pass


class ConversationNotFoundError(ConversationMemoryError):
    """Raised when the requested conversation session does not exist in the store."""
    pass


class MemoryOverflowError(ConversationMemoryError):
    """Raised when messages exceed context boundaries and cannot be trimmed/summarized."""
    pass


class SummaryGenerationError(ConversationMemoryError):
    """Raised when summarizer encounters issues invoking the LLM provider."""
    pass


class InvalidConversationError(ConversationMemoryError):
    """Raised when validation check on conversation ID or message shape fails."""
    pass
