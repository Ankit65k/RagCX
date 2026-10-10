from typing import List
from langchain_ollama import OllamaEmbeddings
from app.embeddings.base import EmbeddingProvider
from app.core.config.settings import settings


class OllamaEmbeddingProvider(EmbeddingProvider):
    """
    LangChain Ollama Embedding Provider mapping abstract interfaces.
    """

    def __init__(self) -> None:
        self.embeddings = OllamaEmbeddings(
            model=settings.OLLAMA_EMBED_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
        self.model = settings.OLLAMA_EMBED_MODEL

    async def embed_query(self, text: str) -> List[float]:
        return await self.embeddings.aembed_query(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return await self.embeddings.aembed_documents(texts)
