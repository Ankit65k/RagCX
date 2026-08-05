class ChatPipelineError(Exception):
    """Base exception class for all chat event pipeline errors."""
    pass


class ConversationError(ChatPipelineError):
    """Raised when there is an issue loading or creating conversation state."""
    pass


class MemoryError(ChatPipelineError):
    """Raised when memory operations (append/load) fail."""
    pass


class WorkflowExecutionError(ChatPipelineError):
    """Raised when the LangGraph workflow engine fails during execution."""
    pass


class ResponsePublishError(ChatPipelineError):
    """Raised when publishing the chat response back to Redis fails."""
    pass
