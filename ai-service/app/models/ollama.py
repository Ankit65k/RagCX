from typing import List, Dict, Optional
import httpx
import logging
import time
from app.models.base import LLMProvider
from app.core.config import settings

logger = logging.getLogger("app")


class OllamaProvider(LLMProvider):
    """
    Ollama LLM Provider implementing the LLMProvider abstraction.
    """

    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_CHAT_MODEL
        self.last_metrics: Dict[str, float] = {}  # Store last call metrics

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

    async def chat(self, messages: List[Dict[str, str]], format: Optional[str] = None, timeout: float = 60.0) -> str:
        payload: Dict[str, str | bool | list | dict] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": settings.OLLAMA_TEMPERATURE,
                "num_ctx": 2048,  # Reduced for faster CPU processing
                "num_predict": 150,  # Reduced for faster responses
            }
        }
        if format:
            payload["format"] = format

        try:
            start_time = time.perf_counter()
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            data: Dict[str, dict] = response.json()
            total_time_ms = (time.perf_counter() - start_time) * 1000

            # Extract Ollama internal metrics
            message_data: Dict[str, str] = data.get("message", {})
            eval_count = data.get("eval_count", 0)  # Generated tokens
            prompt_eval_count = data.get("prompt_eval_count", 0)  # Prompt tokens
            load_duration = data.get("load_duration", 0) / 1e6  # ns -> ms
            prompt_eval_duration = data.get("prompt_eval_duration", 0) / 1e6  # ns -> ms
            eval_duration = data.get("eval_duration", 0) / 1e6  # ns -> ms

            # Store for retrieval
            self.last_metrics = {
                "total_time_ms": total_time_ms,
                "load_duration_ms": load_duration,
                "prompt_eval_duration_ms": prompt_eval_duration,
                "eval_duration_ms": eval_duration,
                "prompt_tokens": prompt_eval_count,
                "generated_tokens": eval_count,
            }

            # Log timing breakdown
            logger.info(
                f"[Ollama] LLM call completed:\n"
                f"  Total time: {total_time_ms:.1f}ms\n"
                f"  Model load: {load_duration:.1f}ms\n"
                f"  Prompt eval: {prompt_eval_duration:.1f}ms ({prompt_eval_count} tokens)\n"
                f"  Generation: {eval_duration:.1f}ms ({eval_count} tokens)\n"
                f"  Tokens/sec: {eval_count / (eval_duration / 1000):.1f}" if eval_duration > 0 else "  Tokens/sec: N/A"
            )

            return message_data.get("content", "")
        except httpx.TimeoutException as e:
            raise Exception(f"Failed to get response from Ollama - request timed out after {timeout} seconds. Check if model is loaded.") from e
        except httpx.HTTPStatusError as e:
            raise Exception(f"Ollama HTTP error {e.response.status_code}: {e.response.text}") from e
        except Exception as e:
            raise Exception(f"Ollama request failed: {str(e)}") from e
