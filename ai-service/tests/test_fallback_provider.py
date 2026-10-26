import asyncio
from typing import Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.base import LLMProvider
from app.models.fallback import FallbackProvider
from app.models.gemini import (
    AuthenticationError,
    LLMTimeoutError,
    ModelUnavailableError,
    RateLimitError,
    ServiceUnavailableError,
)


class FakeProvider(LLMProvider):
    """Fake provider for testing that can be configured to succeed or fail."""

    def __init__(self, name: str):
        self.name = name
        self.generate_calls = 0
        self.chat_calls = 0
        self.should_fail_with: Optional[Exception] = None
        self.last_metrics: Dict[str, float] = {"test_metric": 123.0}
        self.model = name  # Model name for testing

    def configure_failure(self, exception: Exception):
        """Configure this provider to raise the given exception."""
        self.should_fail_with = exception

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        self.generate_calls += 1
        await asyncio.sleep(0.001)  # Simulate async work
        if self.should_fail_with:
            raise self.should_fail_with
        return f"[{self.name}] response to: {prompt[:20]}..."

    async def chat(self, messages: List[Dict[str, str]], format: Optional[str] = None, **kwargs) -> str:
        self.chat_calls += 1
        await asyncio.sleep(0.001)  # Simulate async work
        if self.should_fail_with:
            raise self.should_fail_with
        return f"[{self.name}] chat response"


@pytest.fixture
def providers():
    """Create fake providers for testing."""
    return {
        "primary": FakeProvider("primary_gemini"),
        "fallback": FakeProvider("fallback_gemini"),
        "ollama": FakeProvider("ollama"),
    }


@pytest.fixture
def fallback_provider(providers):
    """Create FallbackProvider with fake providers."""
    return FallbackProvider(
        primary_provider=providers["primary"],
        fallback_provider=providers["fallback"],
        ollama_provider=providers["ollama"],
    )


@pytest.fixture
def fallback_provider_no_secondary(providers):
    """Create FallbackProvider without secondary Gemini."""
    return FallbackProvider(
        primary_provider=providers["primary"],
        fallback_provider=None,
        ollama_provider=providers["ollama"],
    )


# =============================================================================
# Success Path Tests
# =============================================================================


@pytest.mark.asyncio
async def test_primary_succeeds(fallback_provider, providers):
    """Primary Gemini succeeds - no fallback needed."""
    result = await fallback_provider.generate("test prompt")

    assert result == "[primary_gemini] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["fallback"].generate_calls == 0
    assert providers["ollama"].generate_calls == 0


@pytest.mark.asyncio
async def test_primary_fails_fallback_succeeds(fallback_provider, providers):
    """Primary Gemini fails, fallback Gemini succeeds."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[fallback_gemini] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["fallback"].generate_calls == 1
    assert providers["ollama"].generate_calls == 0


@pytest.mark.asyncio
async def test_both_gemini_fail_ollama_succeeds(fallback_provider, providers):
    """Both Gemini models fail, Ollama succeeds."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))
    providers["fallback"].configure_failure(LLMTimeoutError("Timeout"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[ollama] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["fallback"].generate_calls == 1
    assert providers["ollama"].generate_calls == 1


@pytest.mark.asyncio
async def test_no_secondary_fallback_to_ollama(fallback_provider_no_secondary, providers):
    """Primary fails, no secondary configured, goes to Ollama."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))

    result = await fallback_provider_no_secondary.generate("test prompt")

    assert result == "[ollama] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["ollama"].generate_calls == 1


# =============================================================================
# Retry Logic Tests
# =============================================================================


@pytest.mark.asyncio
async def test_rate_limit_retry_then_success(fallback_provider, providers):
    """RateLimitError triggers retry, second attempt succeeds."""
    call_count = 0

    async def generate_with_retry(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(0.001)
        if call_count == 1:
            raise RateLimitError("Rate limited")
        return "[primary_gemini] response after retry"

    providers["primary"].generate = generate_with_retry

    result = await fallback_provider.generate("test prompt")

    assert result == "[primary_gemini] response after retry"
    assert call_count == 2  # Initial + retry


@pytest.mark.asyncio
async def test_service_unavailable_retry_then_success(fallback_provider, providers):
    """ServiceUnavailableError triggers retry, second attempt succeeds."""
    call_count = 0

    async def generate_with_retry(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(0.001)
        if call_count == 1:
            raise ServiceUnavailableError("Service down")
        return "[primary_gemini] response after retry"

    providers["primary"].generate = generate_with_retry

    result = await fallback_provider.generate("test prompt")

    assert result == "[primary_gemini] response after retry"
    assert call_count == 2  # Initial + retry


@pytest.mark.asyncio
async def test_rate_limit_retry_fails_goes_to_fallback(fallback_provider, providers):
    """RateLimitError retry fails, goes to fallback Gemini."""
    providers["primary"].configure_failure(RateLimitError("Rate limited"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[fallback_gemini] response to: test prompt..."
    assert providers["primary"].generate_calls == 2  # Initial + retry
    assert providers["fallback"].generate_calls == 1


@pytest.mark.asyncio
async def test_model_unavailable_no_retry(fallback_provider, providers):
    """ModelUnavailableError skips retry and goes to fallback immediately."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[fallback_gemini] response to: test prompt..."
    assert providers["primary"].generate_calls == 1  # No retry
    assert providers["fallback"].generate_calls == 1


@pytest.mark.asyncio
async def test_timeout_no_retry(fallback_provider, providers):
    """LLMTimeoutError skips retry and goes to fallback immediately."""
    providers["primary"].configure_failure(LLMTimeoutError("Timed out"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[fallback_gemini] response to: test prompt..."
    assert providers["primary"].generate_calls == 1  # No retry
    assert providers["fallback"].generate_calls == 1


# =============================================================================
# Authentication Error Tests
# =============================================================================


@pytest.mark.asyncio
async def test_auth_error_skips_fallback_gemini(fallback_provider, providers):
    """AuthenticationError on primary skips fallback Gemini (same key) and goes to Ollama."""
    providers["primary"].configure_failure(AuthenticationError("Invalid API key"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[ollama] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["fallback"].generate_calls == 0  # Skipped
    assert providers["ollama"].generate_calls == 1


@pytest.mark.asyncio
async def test_auth_error_on_fallback_goes_to_ollama(fallback_provider, providers):
    """AuthenticationError on fallback Gemini goes to Ollama."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))
    providers["fallback"].configure_failure(AuthenticationError("Invalid API key"))

    result = await fallback_provider.generate("test prompt")

    assert result == "[ollama] response to: test prompt..."
    assert providers["primary"].generate_calls == 1
    assert providers["fallback"].generate_calls == 1
    assert providers["ollama"].generate_calls == 1


# =============================================================================
# Failure Path Tests
# =============================================================================


@pytest.mark.asyncio
async def test_all_providers_fail(fallback_provider, providers):
    """All providers fail - raises user-friendly error."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))
    providers["fallback"].configure_failure(LLMTimeoutError("Timeout"))
    providers["ollama"].configure_failure(Exception("Ollama down"))

    with pytest.raises(Exception) as exc_info:
        await fallback_provider.generate("test prompt")

    error_msg = str(exc_info.value)
    # User-friendly message, no internal details
    assert "All LLM providers failed" in error_msg
    assert "Please try again later" in error_msg
    # Should NOT expose internal errors
    assert "Ollama down" not in error_msg


@pytest.mark.asyncio
async def test_primary_and_ollama_fail_no_fallback(fallback_provider_no_secondary, providers):
    """Primary and Ollama fail with no secondary configured."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))
    providers["ollama"].configure_failure(Exception("Ollama down"))

    with pytest.raises(Exception) as exc_info:
        await fallback_provider_no_secondary.generate("test prompt")

    error_msg = str(exc_info.value)
    # User-friendly message
    assert "All LLM providers failed" in error_msg
    assert "Please try again later" in error_msg


# =============================================================================
# Chat Method Tests
# =============================================================================


@pytest.mark.asyncio
async def test_chat_primary_succeeds(fallback_provider, providers):
    """Chat with primary Gemini succeeds."""
    messages = [{"role": "user", "content": "Hello"}]
    result = await fallback_provider.chat(messages)

    assert result == "[primary_gemini] chat response"
    assert providers["primary"].chat_calls == 1
    assert providers["fallback"].chat_calls == 0
    assert providers["ollama"].chat_calls == 0


@pytest.mark.asyncio
async def test_chat_fallback_to_ollama(fallback_provider, providers):
    """Chat falls back through chain to Ollama."""
    providers["primary"].configure_failure(RateLimitError("Rate limited"))
    providers["fallback"].configure_failure(ModelUnavailableError("Model not found"))

    messages = [{"role": "user", "content": "Hello"}]
    result = await fallback_provider.chat(messages)

    assert result == "[ollama] chat response"
    assert providers["primary"].chat_calls == 2  # Initial + retry
    assert providers["fallback"].chat_calls == 1
    assert providers["ollama"].chat_calls == 1


@pytest.mark.asyncio
async def test_chat_auth_error_skips_to_ollama(fallback_provider, providers):
    """Chat with AuthenticationError skips fallback Gemini."""
    providers["primary"].configure_failure(AuthenticationError("Invalid API key"))

    messages = [{"role": "user", "content": "Hello"}]
    result = await fallback_provider.chat(messages)

    assert result == "[ollama] chat response"
    assert providers["primary"].chat_calls == 1
    assert providers["fallback"].chat_calls == 0  # Skipped
    assert providers["ollama"].chat_calls == 1


# =============================================================================
# Metrics Tests
# =============================================================================


@pytest.mark.asyncio
async def test_metrics_copied_from_successful_provider(fallback_provider, providers):
    """Metrics are copied from whichever provider succeeds."""
    providers["primary"].last_metrics = {"primary_metric": 999.0}

    await fallback_provider.generate("test prompt")

    assert fallback_provider.last_metrics == {"primary_metric": 999.0}


@pytest.mark.asyncio
async def test_metrics_from_fallback_provider(fallback_provider, providers):
    """Metrics copied from fallback when primary fails."""
    providers["primary"].configure_failure(ModelUnavailableError("Not found"))
    providers["fallback"].last_metrics = {"fallback_metric": 777.0}

    await fallback_provider.generate("test prompt")

    assert fallback_provider.last_metrics == {"fallback_metric": 777.0}


@pytest.mark.asyncio
async def test_metrics_from_ollama(fallback_provider, providers):
    """Metrics copied from Ollama when Gemini models fail."""
    providers["primary"].configure_failure(ModelUnavailableError("Not found"))
    providers["fallback"].configure_failure(LLMTimeoutError("Timeout"))
    providers["ollama"].last_metrics = {"ollama_metric": 555.0}

    await fallback_provider.generate("test prompt")

    assert fallback_provider.last_metrics == {"ollama_metric": 555.0}


@pytest.mark.asyncio
async def test_model_property_returns_primary_model(fallback_provider, providers):
    """FallbackProvider.model returns the primary provider's model name."""
    # The primary provider is "primary_gemini", so model should match
    assert fallback_provider.model == "primary_gemini"
    assert fallback_provider.model == providers["primary"].model


# =============================================================================
# Time Budget Tests
# =============================================================================


@pytest.mark.asyncio
async def test_primary_fails_twice_fallback_fails_ollama_still_runs(fallback_provider, providers):
    """Primary fails twice (retry), fallback fails, Ollama still runs.

    This tests the time budget: 60s timeout with Gemini budget = min(25s, 30s) = 25s.
    - Primary Gemini: ~12.5s budget (25s/2 with fallback configured)
    - Fallback Gemini: ~12.5s budget
    - Ollama: gets remaining time (60 - elapsed), capped at 110s
    """
    # Configure primary to fail twice (rate limit then model unavailable)
    call_count = 0

    async def primary_fails_twice(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(0.001)
        if call_count == 1:
            raise RateLimitError("Rate limited")
        raise ModelUnavailableError("Model not found")

    providers["primary"].generate = primary_fails_twice

    # Configure fallback to fail immediately
    providers["fallback"].configure_failure(LLMTimeoutError("Timeout"))

    # Ollama should still succeed
    result = await fallback_provider.generate("test prompt")

    assert result == "[ollama] response to: test prompt..."
    assert call_count == 2  # Primary was called twice (initial + retry)
    # Note: generate_calls not incremented because we replaced the method
    assert providers["fallback"].generate_calls == 1
    assert providers["ollama"].generate_calls == 1


@pytest.mark.asyncio
async def test_timeout_forwarded_to_gemini(fallback_provider, providers):
    """Verify timeout is passed through to Gemini providers and time budget logic works."""
    received_timeouts = []

    async def capture_timeout(*args, **kwargs):
        nonlocal received_timeouts
        # Find the timeout kwarg
        timeout_val = kwargs.get('timeout', 'not_found')
        received_timeouts.append(timeout_val)
        await asyncio.sleep(0.001)
        raise ModelUnavailableError("Model not found")

    providers["primary"].generate = capture_timeout
    providers["fallback"].generate = capture_timeout

    # Test with 30s timeout - Gemini budget = min(25s, 15s) = 15s
    # With fallback configured: 15s / 2 = 7.5s per attempt, capped at 15s
    await fallback_provider.generate("test prompt", timeout=30.0)

    # With 30s timeout: Gemini gets 15s total budget (half of 30s), should try Gemini
    # Primary should be called with timeout ~7.5s (min(15s/2, 15s) = 7.5s)
    assert len(received_timeouts) == 2  # Primary + fallback both called
    # The timeout should be approximately 7.5s (half of the 15s gemini budget)
    # Since we cap at GEMINI_PER_ATTEMPT_CAP (15s), and budget/2 = 7.5s, we expect ~7.5s
    assert received_timeouts[0] == pytest.approx(7.5, rel=0.1)  # Primary timeout
    assert received_timeouts[1] == pytest.approx(7.5, rel=0.1)  # Fallback timeout


@pytest.mark.asyncio
async def test_user_friendly_error_messages(fallback_provider, providers):
    """Ensure error messages are user-friendly, not SDK internals."""
    providers["primary"].configure_failure(ModelUnavailableError("Model not found"))
    providers["fallback"].configure_failure(LLMTimeoutError("Timeout"))
    providers["ollama"].configure_failure(Exception("Connection refused"))

    with pytest.raises(Exception) as exc_info:
        await fallback_provider.generate("test prompt")

    error_msg = str(exc_info.value)
    # Should NOT contain raw SDK errors or hints like "check GEMINI_MODEL"
    assert "All LLM providers failed. Please try again later." in error_msg
    assert "Connection refused" not in error_msg  # Raw SDK error should not leak
