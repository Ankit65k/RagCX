from abc import ABC, abstractmethod
from typing import List


class EmbeddingProvider(ABC):
    """
    Abstract Base Class for Embedding providers, ensuring clean separation of 
    vector embedding client implementations.
    """

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """
        Computes vector embeddings for a single text query.
        """
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Computes vector embeddings for a list of document strings.
        """
        pass
