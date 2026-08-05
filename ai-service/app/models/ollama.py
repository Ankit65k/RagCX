from typing import List, Dict, Optional
import httpx
from app.models.base import LLMProvider
from app.core.config import settings


class OllamaProvider(LLMProvider):
    """
    Ollama LLM Provider implementing the LLMProvider abstraction.
    """

    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.LLM_MODEL

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        payload: Dict[str, str | bool | dict] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        response = await self.client.post(
            f"{self.base_url}/api/generate",
            json=payload,
        )
        response.raise_for_status()
        data: Dict[str, str] = response.json()
        return data.get("response", "")

    async def chat(self, messages: List[Dict[str, str]], format: Optional[str] = None) -> str:
        payload: Dict[str, str | bool | list] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }
        if format:
            payload["format"] = format

        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        data: Dict[str, dict] = response.json()
        message_data: Dict[str, str] = data.get("message", {})
        return message_data.get("content", "")
