class RAGPipelineError(Exception):
    """Base exception for all RAG pipeline operations."""
    pass


class RetrievalError(RAGPipelineError):
    """Raised when the retriever fails to return results."""
    pass


class GenerationError(RAGPipelineError):
    """Raised when the LLM fails to produce an answer."""
    pass


class PromptError(RAGPipelineError):
    """Raised when the prompt cannot be assembled from available inputs."""
    pass


class ValidationError(RAGPipelineError):
    """Raised when query or answer validation fails."""

    def __init__(self, field: str, message: str) -> None:
        self.field = field
        super().__init__(f"Validation failed for '{field}': {message}")


class PipelineExecutionError(RAGPipelineError):
    """Raised when an unrecoverable error occurs during pipeline execution."""
    pass
