import logging
from typing import Any

from app.vector_store.base import VectorStore
from app.vector_store.chroma import ChromaVectorStore
from app.core.config.settings import settings
from app.vector_store.exceptions import CollectionNotFoundError

logger = logging.getLogger("app")


class VectorStoreFactory:
    """
    Factory instantiating concrete VectorStore interfaces.
    Decouples database engines from the business layout.
    """

    @staticmethod
    def get_vector_store(client: Any) -> VectorStore:
        # Currently maps to ChromaDB. In the future, this can read
        # configuration variables to instantiate QdrantVectorStore, pgvector, Weaviate, etc.
        provider = "chromadb" # Default mock config check
        logger.info(f"Factory: Resolving VectorStore provider: ChromaVectorStore")
        return ChromaVectorStore(client)
