import logging
from typing import Dict, Type
from app.embeddings.base import EmbeddingProvider
from app.embeddings.ollama import OllamaEmbeddingProvider
from app.core.config.settings import settings
from app.embeddings.exceptions import EmbeddingValidationError

logger = logging.getLogger("app")


class EmbeddingFactory:
    """
    Factory resolving concrete EmbeddingProvider implementations based on settings.
    Allows extending to OpenAI, SentenceTransformers, or HuggingFace without modifying
    business logic.
    """

    _providers: Dict[str, Type[EmbeddingProvider]] = {
        "ollama": OllamaEmbeddingProvider,
        # Future providers can be registered here:
        # "openai": OpenAIEmbeddingProvider,
        # "huggingface": HuggingFaceEmbeddingProvider,
    }

    @classmethod
    def get_provider(cls) -> EmbeddingProvider:
        provider_name = settings.EMBEDDING_PROVIDER.lower().strip()
        
        provider_class = cls._providers.get(provider_name)
        if not provider_class:
            raise EmbeddingValidationError(
                f"Unsupported embedding provider: '{settings.EMBEDDING_PROVIDER}'. "
                f"Allowed providers: {list(cls._providers.keys())}"
            )
        
        logger.info(f"Factory: Resolved embedding provider: {provider_class.__name__}")
        return provider_class()
