class VectorStoreError(Exception):
    """Base exception for all vector database operations."""
    pass


class CollectionNotFoundError(VectorStoreError):
    """Raised when querying a collection name that does not exist."""
    pass


class VectorInsertError(VectorStoreError):
    """Raised when record insertions fail structural or database validation constraints."""
    pass


class VectorSearchError(VectorStoreError):
    """Raised when similarity or query search operations crash."""
    pass


class InvalidEmbeddingError(VectorStoreError):
    """Raised when vector shapes or configurations are malformed."""
    pass


class DuplicateVectorError(VectorStoreError):
    """Raised when inserting duplicate chunk IDs."""
    pass
