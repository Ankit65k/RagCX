from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

from app.embeddings.models import EmbeddingResult
from app.vector_store.models import SearchResultItem, CollectionStats


class VectorStore(ABC):
    """
    Abstract Base Class for Vector Store operations.
    Ensures that switching vector stores (Qdrant, Pinecone, pgvector) requires 
    zero business logic changes.
    """

    @abstractmethod
    async def create_collection(self, collection_name: str) -> None:
        """Creates a collection or opens it if it already exists."""
        pass

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> None:
        """Deletes a collection."""
        pass

    @abstractmethod
    async def reset_collection(self, collection_name: str) -> None:
        """Clears all records within the collection without deleting the collection itself."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Performs a basic connectivity check with the Vector Database."""
        pass

    @abstractmethod
    async def insert_embeddings(self, embedding_result: EmbeddingResult) -> None:
        """Inserts a batch of vectorized chunk models into the vector database."""
        pass

    @abstractmethod
    async def update_embeddings(self, embedding_result: EmbeddingResult) -> None:
        """Updates metadata or vectors of existing document chunk records."""
        pass

    @abstractmethod
    async def delete_document(self, document_id: str) -> None:
        """Deletes all vector chunks associated with the given documentId."""
        pass

    @abstractmethod
    async def delete_chunk(self, chunk_id: str) -> None:
        """Deletes a single vector chunk by its chunk ID."""
        pass

    @abstractmethod
    async def similarity_search(
        self,
        query_vector: List[float],
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResultItem]:
        """Runs vector similarity searches over the active collection."""
        pass

    @abstractmethod
    async def get_statistics(self) -> CollectionStats:
        """Returns structural dimensions and metrics from the active collection."""
        pass
