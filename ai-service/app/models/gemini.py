import asyncio
import logging
import time
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from app.core.config import settings
from app.models.base import LLMProvider

logger = logging.getLogger("app")

# Import types for runtime
try:
    from google.genai import types
except ImportError:
    types = None  # type: ignore[assignment]


# =============================================================================
# Exception Hierarchy
# =============================================================================

class LLMProviderError(Exception):
    """Base exception for LLM provider errors."""
    pass


class RateLimitError(LLMProviderError):
    """Raised when the API returns 429 Too Many Requests."""
    pass


class ServiceUnavailableError(LLMProviderError):
    """Raised when the API returns 500, 502, 503, or 504."""
    pass


class ModelUnavailableError(LLMProviderError):
    """Raised when the API returns 404 (model not found)."""
    pass


class AuthenticationError(LLMProviderError):
    """Raised when the API returns 401 Unauthorized or 403 Forbidden."""
    pass


class LLMTimeoutError(LLMProviderError):
    """Raised when the request exceeds the configured timeout."""
    pass


class GeminiProvider(LLMProvider):
    """
    Google Gemini LLM Provider implementing the LLMProvider abstraction.

    Features:
    - Native async client (client.aio) with real cancellation support
    - Per-request configurable timeout via HTTP options
    - Structured error mapping (429, 503, 401/403, 404, timeouts)
    - Safe logging (never exposes API key or full prompts)
    """

    # Configuration constants (in SECONDS)
    DEFAULT_TIMEOUT: float = 30.0  # seconds
    MAX_TIMEOUT: float = 60.0  # seconds
    GEMINI_TOTAL_BUDGET: float = 25.0  # Total time budget for Gemini attempts
    GEMINI_PER_ATTEMPT_CAP: float = 15.0  # Cap per individual Gemini attempt

    def __init__(self, model: str) -> None:
        self.model = model
        self.api_key = settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else ""
        if not self.api_key:
            raise AuthenticationError("Gemini API key is not configured")

        try:
            from google import genai

            # Initialize client without per-request timeout (will set per-call)
            self.client = genai.Client(api_key=self.api_key).aio

        except ImportError:
            raise LLMProviderError(
                "google-genai package is required for GeminiProvider. "
                "Install it with: pip install google-genai"
            )

        self.last_metrics: Dict[str, float] = {}

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> str:
        """
        Single-turn text generation using Gemini.

        Args:
            prompt: The user prompt to generate a response for.
            system_prompt: Optional system instruction.
            timeout: Request timeout in seconds (default 30, max 60).

        Returns:
            The generated text response.

        Raises:
            RateLimitError: 429 response from API
            ServiceUnavailableError: 500/502/503/504 response from API
            ModelUnavailableError: 404 response from API
            AuthenticationError: 401/403 response or missing API key
            LLMTimeoutError: Request exceeded timeout
        """
        effective_timeout = min(timeout, self.MAX_TIMEOUT)

        try:
            from google.genai import types

            start_time = time.perf_counter()

            # Build contents list - never log these
            contents = []
            if system_prompt:
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=system_prompt)])
                )
            contents.append(types.Content(role="user", parts=[types.Part(text=prompt)]))

            # Configure generation - temperature 0.2, max 1000 tokens
            config = types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=1000,
                response_modalities=["TEXT"],
            )

            # Time budget: cap individual attempt at 15s, total Gemini budget at 25s
            per_attempt_timeout = min(self.GEMINI_PER_ATTEMPT_CAP, effective_timeout)
            sdk_timeout_ms = int(per_attempt_timeout * 1000)
            http_options = types.HttpOptions(
                timeout=sdk_timeout_ms,
                retry_options=types.HttpRetryOptions(attempts=1)
            )

            response = await self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
                http_options=http_options,
            )

            total_time_ms = (time.perf_counter() - start_time) * 1000

            # Extract token usage
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
            completion_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0

            self.last_metrics = {
                "total_time_ms": total_time_ms,
                "prompt_tokens": prompt_tokens,
                "generated_tokens": completion_tokens,
            }

            # Safe logging - model name only, no prompt content
            logger.info(
                f"[Gemini] Generation completed: model={self.model}, "
                f"time={total_time_ms:.1f}ms, tokens={prompt_tokens}+{completion_tokens}"
            )

            # Extract response text
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    return candidate.content.parts[0].text

            return ""

        except asyncio.TimeoutError:
            raise LLMTimeoutError(
                "Request timed out. Please try again."
            ) from None
        except Exception as e:
            self._map_api_error(e)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        format: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> str:
        """
        Multi-turn chat using Gemini.

        Args:
            messages: List of chat messages with 'role' and 'content' keys.
            format: Optional output format ('json' for JSON mode).
            timeout: Request timeout in seconds (default 30, max 60).

        Returns:
            The generated text response.

        Raises:
            RateLimitError: 429 response from API
            ServiceUnavailableError: 500/502/503/504 response from API
            ModelUnavailableError: 404 response from API
            AuthenticationError: 401/403 response or missing API key
            LLMTimeoutError: Request exceeded timeout
        """
        effective_timeout = min(timeout, self.MAX_TIMEOUT)

        try:
            from google.genai import types

            start_time = time.perf_counter()

            # Convert messages to Gemini format - never log these
            contents = []
            for msg in messages:
                role = "model" if msg["role"] == "assistant" else "user"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=msg["content"])]
                    )
                )

            # Configure generation
            config = types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=1000,
                response_modalities=["TEXT"],
            )

            if format == "json":
                config.response_mime_type = "application/json"

            # Time budget: cap individual attempt at 15s, total Gemini budget at 25s
            per_attempt_timeout = min(self.GEMINI_PER_ATTEMPT_CAP, effective_timeout)
            sdk_timeout_ms = int(per_attempt_timeout * 1000)
            http_options = types.HttpOptions(
                timeout=sdk_timeout_ms,
                retry_options=types.HttpRetryOptions(attempts=1)
            )

            response = await self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
                http_options=http_options,
            )

            total_time_ms = (time.perf_counter() - start_time) * 1000

            # Extract token usage
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage, "prompt_token_count", 0) if usage else 0
            completion_tokens = getattr(usage, "candidates_token_count", 0) if usage else 0

            self.last_metrics = {
                "total_time_ms": total_time_ms,
                "prompt_tokens": prompt_tokens,
                "generated_tokens": completion_tokens,
            }

            # Safe logging
            logger.info(
                f"[Gemini] Chat completed: model={self.model}, "
                f"time={total_time_ms:.1f}ms, tokens={prompt_tokens}+{completion_tokens}"
            )

            # Extract response text
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    return candidate.content.parts[0].text

            return ""

        except asyncio.TimeoutError:
            raise LLMTimeoutError(
                "Request timed out. Please try again."
            ) from None
        except Exception as e:
            self._map_api_error(e)

    def _map_api_error(self, error) -> None:
        """
        Map SDK exceptions to our custom exception types.

        Critical: This function NEVER logs str(error) which could contain API keys or prompts.
        """
        import google.genai.errors

        # Check SDK error class
        if isinstance(error, google.genai.errors.APIError):
            # Extract numeric code without exposing raw error text
            status_code = getattr(error, "code", None)

            # Map numeric codes to specific exceptions (no string matching)
            if status_code == 429:
                raise RateLimitError(
                    "Gemini API rate limit exceeded. Please wait before retrying."
                ) from error
            elif status_code == 404:
                raise ModelUnavailableError(
                    "Gemini model not found."
                ) from error
            elif status_code in (500, 502, 503, 504):
                raise ServiceUnavailableError(
                    "Gemini API is temporarily unavailable. Please retry shortly."
                ) from error
            elif status_code in (401, 403):
                raise AuthenticationError(
                    "Gemini API authentication failed. Please check your API key."
                ) from error
            else:
                # Generic API error with safe message (no API key, no prompt)
                raise LLMProviderError(f"Gemini API error (status={status_code})") from error

        # Re-raise unknown errors
        raise error
