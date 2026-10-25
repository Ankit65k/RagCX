import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.models.base import LLMProvider
from app.models.fallback import FallbackProvider
from app.models.gemini import AuthenticationError, GeminiProvider
from app.models.ollama import OllamaProvider

logger = logging.getLogger("app")


def create_llm_provider(client: httpx.AsyncClient) -> LLMProvider:
    """
    Factory function to create the appropriate LLM provider based on configuration.

    Rules:
    - If LLM_PROVIDER="ollama": return OllamaProvider directly
    - If LLM_PROVIDER="gemini":
      - If GEMINI_API_KEY or GEMINI_MODEL is empty: log warning and fall back to Ollama
      - Otherwise: return FallbackProvider with Gemini primary/fallback + Ollama

    The FallbackProvider handles the retry and fallback logic between models.

    Args:
        client: httpx.AsyncClient for HTTP requests (used by Ollama)

    Returns:
        LLMProvider: Configured provider instance

    Raises:
        ValueError: If LLM_PROVIDER has an invalid value
    """
    provider_name = settings.LLM_PROVIDER.lower()

    if provider_name == "ollama":
        logger.info("[Factory] Using Ollama provider directly")
        return OllamaProvider(client)

    elif provider_name == "gemini":
        # Check if Gemini is properly configured
        api_key = settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else ""
        primary_model = settings.GEMINI_MODEL.strip()

        if not api_key or not primary_model:
            logger.warning(
                "[Factory] GEMINI_API_KEY or GEMINI_MODEL is not configured. "
                "Falling back to Ollama provider."
            )
            return OllamaProvider(client)

        # Try to create Gemini providers
        try:
            primary_provider = GeminiProvider(model=primary_model)
            logger.info(f"[Factory] Created primary Gemini provider: {primary_model}")
        except AuthenticationError as e:
            logger.error(
                f"[Factory] Failed to create Gemini provider: {str(e)}. "
                "Falling back to Ollama."
            )
            return OllamaProvider(client)
        except Exception as e:
            logger.error(
                f"[Factory] Unexpected error creating Gemini provider: {type(e).__name__}. "
                "Falling back to Ollama."
            )
            return OllamaProvider(client)

        # Try to create fallback Gemini provider if configured
        fallback_provider: Optional[GeminiProvider] = None
        fallback_model = settings.GEMINI_FALLBACK_MODEL.strip()

        if fallback_model and fallback_model != primary_model:
            try:
                fallback_provider = GeminiProvider(model=fallback_model)
                logger.info(f"[Factory] Created fallback Gemini provider: {fallback_model}")
            except Exception as e:
                logger.warning(
                    f"[Factory] Failed to create fallback Gemini provider: {type(e).__name__}. "
                    "Continuing with primary only."
                )

        # Create Ollama as final fallback
        ollama_provider = OllamaProvider(client)

        # Return FallbackProvider that orchestrates the chain
        logger.info(
            f"[Factory] Created FallbackProvider: "
            f"primary={primary_model}, "
            f"fallback={fallback_model if fallback_provider else 'none'}, "
            f"ollama={settings.OLLAMA_CHAT_MODEL}"
        )
        return FallbackProvider(
            primary_provider=primary_provider,
            fallback_provider=fallback_provider,
            ollama_provider=ollama_provider,
        )

    else:
        raise ValueError(
            f"Invalid LLM_PROVIDER: '{settings.LLM_PROVIDER}'. "
            f"Must be 'ollama' or 'gemini'."
        )
