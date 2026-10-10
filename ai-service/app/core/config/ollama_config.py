from pydantic import BaseModel, Field


class OllamaConfig(BaseModel):
    """
    Ollama LLM inference configuration details.
    """
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_CHAT_MODEL: str = Field(default="llama3.2:1b")
    OLLAMA_EMBED_MODEL: str = Field(default="nomic-embed-text")
    OLLAMA_TEMPERATURE: float = 0.3
    OLLAMA_TOP_P: float = 0.9
    OLLAMA_TOP_K: int = 40
    OLLAMA_CONTEXT_WINDOW: int = 2048
    OLLAMA_REQUEST_TIMEOUT: float = 110.0
    OLLAMA_KEEP_ALIVE: str = "30m"
    OLLAMA_STREAMING: bool = False
