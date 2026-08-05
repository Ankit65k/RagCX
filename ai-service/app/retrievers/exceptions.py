class RetrieverError(Exception):
    """Base exception for all retrieval operations."""
    pass


class InvalidQueryError(RetrieverError):
    """Raised when the text query is blank, empty, or exceeds length boundaries."""
    pass


class RetrievalError(RetrieverError):
    """Raised when database fetches or query executions crash."""
    pass


class SearchTimeoutError(RetrieverError):
    """Raised when database query execution times out."""
    pass


class EmbeddingGenerationError(RetrieverError):
    """Raised when translating user query text to vector embeddings fails."""
    pass
