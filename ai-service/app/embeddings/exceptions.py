class EmbeddingServiceError(Exception):
    """Base exception for all embedding pipeline failures."""
    pass


class EmbeddingError(EmbeddingServiceError):
    """Raised when general failures occur during vector generation."""
    pass


class EmbeddingTimeoutError(EmbeddingServiceError):
    """Raised when Ollama connection or inference requests time out."""
    pass


class EmbeddingValidationError(EmbeddingServiceError):
    """Raised when validation constraints (dimensions, contents) are violated."""
    pass


class ModelUnavailableError(EmbeddingServiceError):
    """Raised when the requested embedding model is missing on the provider."""
    pass


class BatchProcessingError(EmbeddingServiceError):
    """Raised when one or more concurrent batch partitioning tasks fail."""
    pass
