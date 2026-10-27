import asyncio
import logging
from typing import Dict, List, Optional

from app.core.config import settings
from app.models.base import LLMProvider
from app.models.gemini import (
    AuthenticationError,
    LLMTimeoutError,
    ModelUnavailableError,
    RateLimitError,
    ServiceUnavailableError,
)

logger = logging.getLogger("app")


class FallbackProvider(LLMProvider):
    """
    Fallback provider that tries Gemini models first, then falls back to Ollama.

    Time budget rules:
    - Gemini budget: GEMINI_TOTAL_BUDGET (default 30s), never exceeds half of caller's total timeout
    - Each Gemini attempt capped at GEMINI_PER_ATTEMPT_CAP (default 20s)
    - Ollama gets all remaining time (total_timeout minus time spent), capped at AI_SERVICE_LIMIT (110s)
    - Gemini is always tried when caller's timeout is at least ~10s

    Retry logic per model:
    - RateLimitError or ServiceUnavailableError: wait 2s and retry once
    - ModelUnavailableError or LLMTimeoutError: skip to next model immediately
    - AuthenticationError: skip fallback Gemini and go directly to Ollama
    - Any other error: skip to next model
    """

    # Timing constants
    RETRY_DELAY: float = 2.0  # seconds to wait before retry
    AI_SERVICE_LIMIT: float = 110.0  # AI-service hard limit

    def __init__(self, primary_provider: LLMProvider, fallback_provider: Optional[LLMProvider], ollama_provider: LLMProvider):
        """
        Initialize with primary Gemini, optional fallback Gemini, and Ollama.

        Args:
            primary_provider: Primary Gemini model (GEMINI_MODEL)
            fallback_provider: Secondary Gemini model (GEMINI_FALLBACK_MODEL), can be None
            ollama_provider: Final fallback (OLLAMA_CHAT_MODEL)
        """
        self.primary = primary_provider
        self.fallback = fallback_provider
        self.ollama = ollama_provider
        self.last_metrics: Dict[str, float] = {}

    @property
    def model(self) -> str:
        """
        Read-only property that returns the primary provider's model name.
        Used by pipelines that read self.llm_provider.model.
        """
        return getattr(self.primary, "model", "unknown")

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, timeout: float = 60.0) -> str:
        """
        Generate text with fallback logic.

        Args:
            timeout: Total timeout for the entire request chain (default 60s)

        Raises:
            Exception: If all providers fail, raises a clear user-facing error.
        """
        # Cap total time at AI-service limit
        total_timeout = min(timeout, self.AI_SERVICE_LIMIT)

        # Gemini budget: GEMINI_TOTAL_BUDGET but never exceeds half of caller's total timeout
        gemini_budget = min(settings.GEMINI_TOTAL_BUDGET, total_timeout / 2)
        if gemini_budget <= 1.0:
            # Not enough time for Gemini, go directly to Ollama
            remaining_for_ollama = total_timeout
            return await self._try_ollama_with_timeout(prompt, system_prompt, remaining_for_ollama, [], "insufficient time for Gemini")

        start_time = asyncio.get_event_loop().time()
        errors = []

        try:
            # Calculate per-attempt timeout for Gemini (capped at GEMINI_PER_ATTEMPT_CAP)
            per_attempt_budget = gemini_budget / 2 if self.fallback else gemini_budget
            gemini_timeout = min(per_attempt_budget, settings.GEMINI_PER_ATTEMPT_CAP)

            # Try primary Gemini model with retry logic
            try:
                result = await self._try_gemini_with_retry(
                    self.primary,
                    lambda: self.primary.generate(prompt, system_prompt, timeout=gemini_timeout),
                    "primary",
                    start_time,
                    total_timeout,
                    errors
                )
                self._copy_metrics(self.primary)
                logger.info(f"[FallbackProvider] Request served by primary Gemini model")
                return result
            except AuthenticationError as e:
                errors.append("Gemini authentication failed")
                logger.error(f"[FallbackProvider] {errors[-1]} - skipping to Ollama")
                # Skip fallback Gemini (same key) and go directly to Ollama
                return await self._try_ollama_with_timeout(prompt, system_prompt, total_timeout, errors, "authentication error")
            except Exception as e:
                errors.append(f"Primary Gemini failed: {type(e).__name__}")
                logger.warning(f"[FallbackProvider] {errors[-1]}")

            # Try fallback Gemini model if configured
            if self.fallback:
                # Check if we still have time for fallback Gemini
                elapsed = asyncio.get_event_loop().time() - start_time
                remaining_for_gemini = gemini_budget - elapsed
                if remaining_for_gemini <= 1.0:  # Less than 1s left, skip to Ollama
                    logger.warning(f"[FallbackProvider] Not enough time for fallback Gemini ({remaining_for_gemini:.1f}s), going to Ollama")
                else:
                    try:
                        fallback_timeout = min(remaining_for_gemini, gemini_timeout)
                        result = await self._try_gemini_with_retry(
                            self.fallback,
                            lambda: self.fallback.generate(prompt, system_prompt, timeout=fallback_timeout),
                            "fallback",
                            start_time,
                            total_timeout,
                            errors
                        )
                        self._copy_metrics(self.fallback)
                        logger.info(f"[FallbackProvider] Request served by fallback Gemini model")
                        return result
                    except AuthenticationError as e:
                        errors.append("Fallback Gemini authentication failed")
                        logger.error(f"[FallbackProvider] {errors[-1]} - skipping to Ollama")
                        return await self._try_ollama_with_timeout(prompt, system_prompt, total_timeout, errors, "authentication error")
                    except Exception as e:
                        errors.append(f"Fallback Gemini failed: {type(e).__name__}")
                        logger.warning(f"[FallbackProvider] {errors[-1]}")

            # Check if we still have time for Ollama
            elapsed = asyncio.get_event_loop().time() - start_time
            remaining_for_ollama = total_timeout - elapsed
            if remaining_for_ollama < 5.0:  # Less than 5s for Ollama
                raise Exception(
                    f"Request timeout exceeded ({total_timeout:.0f}s). "
                    f"All Gemini attempts failed and insufficient time for Ollama."
                )

            # Try Ollama as final fallback with remaining time
            return await self._try_ollama_with_timeout(prompt, system_prompt, remaining_for_ollama, errors, "all Gemini attempts failed")

        except Exception as e:
            # If we caught an exception with "All LLM providers failed" or "Request timeout", re-raise it
            if any(key in str(e) for key in ["All LLM providers failed", "Request timeout exceeded", "insufficient time"]):
                raise
            # Otherwise, wrap it with user-friendly message
            error_summary = "; ".join(errors) if errors else str(e)
            raise Exception(
                f"Unable to process your request. Please try again. Error: {error_summary}"
            )

    async def chat(self, messages: List[Dict[str, str]], format: Optional[str] = None, timeout: float = 60.0) -> str:
        """
        Chat with fallback logic.

        Args:
            timeout: Total timeout for the entire request chain (default 60s)

        Raises:
            Exception: If all providers fail, raises a clear user-facing error.
        """
        # Cap total time at AI-service limit
        total_timeout = min(timeout, self.AI_SERVICE_LIMIT)

        # Gemini budget: GEMINI_TOTAL_BUDGET but never exceeds half of caller's total timeout
        gemini_budget = min(settings.GEMINI_TOTAL_BUDGET, total_timeout / 2)
        if gemini_budget <= 1.0:
            # Not enough time for Gemini, go directly to Ollama
            remaining_for_ollama = total_timeout
            return await self._try_ollama_chat_with_timeout(messages, format, remaining_for_ollama, [], "insufficient time for Gemini")

        start_time = asyncio.get_event_loop().time()
        errors = []

        try:
            # Calculate per-attempt timeout for Gemini (capped at GEMINI_PER_ATTEMPT_CAP)
            per_attempt_budget = gemini_budget / 2 if self.fallback else gemini_budget
            gemini_timeout = min(per_attempt_budget, settings.GEMINI_PER_ATTEMPT_CAP)

            # Try primary Gemini model with retry logic
            try:
                result = await self._try_gemini_with_retry(
                    self.primary,
                    lambda: self.primary.chat(messages, format, timeout=gemini_timeout),
                    "primary",
                    start_time,
                    total_timeout,
                    errors
                )
                self._copy_metrics(self.primary)
                logger.info(f"[FallbackProvider] Chat served by primary Gemini model")
                return result
            except AuthenticationError as e:
                errors.append("Gemini authentication failed")
                logger.error(f"[FallbackProvider] {errors[-1]} - skipping to Ollama")
                # Skip fallback Gemini (same key) and go directly to Ollama
                return await self._try_ollama_chat_with_timeout(messages, format, total_timeout, errors, "authentication error")
            except Exception as e:
                errors.append(f"Primary Gemini failed: {type(e).__name__}")
                logger.warning(f"[FallbackProvider] {errors[-1]}")

            # Try fallback Gemini model if configured
            if self.fallback:
                # Check if we still have time for fallback Gemini
                elapsed = asyncio.get_event_loop().time() - start_time
                remaining_for_gemini = gemini_budget - elapsed
                if remaining_for_gemini <= 1.0:  # Less than 1s left, skip to Ollama
                    logger.warning(f"[FallbackProvider] Not enough time for fallback Gemini ({remaining_for_gemini:.1f}s), going to Ollama")
                else:
                    try:
                        fallback_timeout = min(remaining_for_gemini, gemini_timeout)
                        result = await self._try_gemini_with_retry(
                            self.fallback,
                            lambda: self.fallback.chat(messages, format, timeout=fallback_timeout),
                            "fallback",
                            start_time,
                            total_timeout,
                            errors
                        )
                        self._copy_metrics(self.fallback)
                        logger.info(f"[FallbackProvider] Chat served by fallback Gemini model")
                        return result
                    except AuthenticationError as e:
                        errors.append("Fallback Gemini authentication failed")
                        logger.error(f"[FallbackProvider] {errors[-1]} - skipping to Ollama")
                        return await self._try_ollama_chat_with_timeout(messages, format, total_timeout, errors, "authentication error")
                    except Exception as e:
                        errors.append(f"Fallback Gemini failed: {type(e).__name__}")
                        logger.warning(f"[FallbackProvider] {errors[-1]}")

            # Check if we still have time for Ollama
            elapsed = asyncio.get_event_loop().time() - start_time
            remaining_for_ollama = total_timeout - elapsed
            if remaining_for_ollama < 5.0:  # Less than 5s for Ollama
                raise Exception(
                    f"Request timeout exceeded ({total_timeout:.0f}s). "
                    f"All Gemini attempts failed and insufficient time for Ollama."
                )

            # Try Ollama as final fallback with remaining time
            return await self._try_ollama_chat_with_timeout(messages, format, remaining_for_ollama, errors, "all Gemini attempts failed")

        except Exception as e:
            # If we caught an exception with "All LLM providers failed" or "Request timeout", re-raise it
            if any(key in str(e) for key in ["All LLM providers failed", "Request timeout exceeded", "insufficient time"]):
                raise
            # Otherwise, wrap it with user-friendly message
            error_summary = "; ".join(errors) if errors else str(e)
            raise Exception(
                f"Unable to process your request. Please try again. Error: {error_summary}"
            )

    async def _try_gemini_with_retry(
        self,
        provider: LLMProvider,
        call,
        model_type: str,
        start_time: float,
        total_timeout: float,
        errors: List[str]
    ):
        """
        Try a Gemini provider with retry logic for rate limits and service errors.

        Args:
            provider: The Gemini provider instance
            call: Async callable that executes the LLM request
            model_type: "primary" or "fallback" for logging
            start_time: Request start time
            total_timeout: Total timeout for the entire chain
            errors: List of accumulated errors

        Raises:
            The exception from the provider if retry logic doesn't apply or retries fail
        """
        try:
            return await call()
        except (RateLimitError, ServiceUnavailableError) as e:
            # Check if we have time for retry
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed + self.RETRY_DELAY >= total_timeout - settings.GEMINI_TOTAL_BUDGET:
                logger.warning(
                    f"[FallbackProvider] {model_type} Gemini {type(e).__name__}, "
                    f"not enough time for retry (elapsed {elapsed:.1f}s)"
                )
                raise

            # Wait and retry once for these errors
            logger.info(
                f"[FallbackProvider] {model_type} Gemini {type(e).__name__}, "
                f"waiting {self.RETRY_DELAY}s before retry"
            )
            await asyncio.sleep(self.RETRY_DELAY)
            try:
                return await call()
            except Exception as retry_error:
                logger.warning(
                    f"[FallbackProvider] {model_type} Gemini retry failed: "
                    f"{type(retry_error).__name__}"
                )
                raise retry_error
        except (ModelUnavailableError, LLMTimeoutError) as e:
            # Skip to next model immediately
            logger.warning(
                f"[FallbackProvider] {model_type} Gemini {type(e).__name__}, "
                f"skipping to next model"
            )
            raise
        except AuthenticationError:
            # Let this bubble up to be handled specially
            raise
        except Exception as e:
            # Unknown error - skip to next model
            logger.warning(
                f"[FallbackProvider] {model_type} Gemini unexpected error: "
                f"{type(e).__name__}"
            )
            raise

    async def _try_ollama_with_timeout(self, prompt: str, system_prompt: Optional[str], timeout: float, errors: List[str], reason: str) -> str:
        """Try Ollama as final fallback for generate() with remaining timeout."""
        try:
            logger.info(f"[FallbackProvider] Trying Ollama as final fallback (reason: {reason})")
            # OllamaProvider currently doesn't accept timeout, but we track it for logging
            result = await self.ollama.generate(prompt, system_prompt)
            self._copy_metrics(self.ollama)
            logger.info(f"[FallbackProvider] Request served by Ollama with {timeout:.1f}s remaining")
            return result
        except Exception as e:
            errors.append(f"Ollama failed: {str(e)}")
            raise Exception(
                f"All LLM providers failed. Please try again later."
            )

    async def _try_ollama_chat_with_timeout(self, messages: List[Dict[str, str]], format: Optional[str], timeout: float, errors: List[str], reason: str) -> str:
        """Try Ollama as final fallback for chat() with remaining timeout."""
        try:
            logger.info(f"[FallbackProvider] Trying Ollama as final fallback (reason: {reason})")
            # Pass the remaining timeout to Ollama for proper resource budgeting
            result = await self.ollama.chat(messages, format, timeout=timeout)
            self._copy_metrics(self.ollama)
            logger.info(f"[FallbackProvider] Chat served by Ollama with {timeout:.1f}s remaining")
            return result
        except Exception as e:
            errors.append(f"Ollama failed: {str(e)}")
            raise Exception(
                f"All LLM providers failed. Please try again later."
            )

    def _copy_metrics(self, provider: LLMProvider):
        """Copy metrics from the provider that successfully served the request."""
        if hasattr(provider, "last_metrics"):
            self.last_metrics = provider.last_metrics.copy()
