from pydantic import BaseModel, Field


class OllamaConfig(BaseModel):
    """
    Ollama LLM inference configuration details.
    """
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    LLM_MODEL: str = Field(default="llama3.1:8b")
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_TOP_P: float = 0.9
    OLLAMA_TOP_K: int = 40
    OLLAMA_CONTEXT_WINDOW: int = 4096
    OLLAMA_REQUEST_TIMEOUT: float = 300.0
    OLLAMA_KEEP_ALIVE: str = "5m"
    OLLAMA_STREAMING: bool = False
