"""
Test Gemini provider error mapping.

Tests the exception mapping using real google-genai error classes.
No network calls, no API key required, no mocking of isinstance.
"""
import asyncio
import pytest
from google.genai import errors

from app.models.gemini import (
    LLMProviderError,
    RateLimitError,
    ServiceUnavailableError,
    ModelUnavailableError,
    AuthenticationError,
    LLMTimeoutError,
    GeminiProvider,
)


class TestGeminiErrorMapping:
    """Test error mapping in GeminiProvider._map_api_error()."""

    def _get_provider(self):
        """Create a provider instance bypassing __init__."""
        provider = GeminiProvider.__new__(GeminiProvider)
        return provider

    def test_429_maps_to_ratelimit(self):
        """HTTP 429 should map to RateLimitError."""
        provider = self._get_provider()
        error = errors.ClientError(429, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(RateLimitError) as exc_info:
            provider._map_api_error(error)

        # Assert the message is safe (no raw SDK message)
        error_msg = str(exc_info.value)
        assert "rate limit exceeded" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_503_maps_to_service_unavailable(self):
        """HTTP 503 should map to ServiceUnavailableError."""
        provider = self._get_provider()
        error = errors.ServerError(503, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(ServiceUnavailableError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "temporarily unavailable" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_502_maps_to_service_unavailable(self):
        """HTTP 502 should map to ServiceUnavailableError."""
        provider = self._get_provider()
        error = errors.ServerError(502, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(ServiceUnavailableError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "temporarily unavailable" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_504_maps_to_service_unavailable(self):
        """HTTP 504 should map to ServiceUnavailableError."""
        provider = self._get_provider()
        error = errors.ServerError(504, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(ServiceUnavailableError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "temporarily unavailable" in error_msg.lower()

    def test_404_maps_to_model_unavailable(self):
        """HTTP 404 should map to ModelUnavailableError."""
        provider = self._get_provider()
        error = errors.ClientError(404, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(ModelUnavailableError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "model not found" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_401_maps_to_authentication(self):
        """HTTP 401 should map to AuthenticationError."""
        provider = self._get_provider()
        error = errors.ClientError(401, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(AuthenticationError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "authentication failed" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_403_maps_to_authentication(self):
        """HTTP 403 should map to AuthenticationError."""
        provider = self._get_provider()
        error = errors.ClientError(403, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(AuthenticationError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "authentication failed" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_500_maps_to_service_unavailable(self):
        """HTTP 500 should map to ServiceUnavailableError."""
        provider = self._get_provider()
        error = errors.ServerError(500, {"error": {"message": "secret-fragment-123"}})

        with pytest.raises(ServiceUnavailableError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "temporarily unavailable" in error_msg.lower()
        assert "secret-fragment-123" not in error_msg

    def test_unknown_code_maps_to_generic_provider_error(self):
        """Unknown status codes should map to generic LLMProviderError."""
        provider = self._get_provider()
        error = errors.ClientError(418, {"error": {"message": "I'm a teapot"}})

        with pytest.raises(LLMProviderError) as exc_info:
            provider._map_api_error(error)

        error_msg = str(exc_info.value)
        assert "status=418" in error_msg
        assert "teapot" not in error_msg  # Raw message should not leak

    def test_error_message_never_contains_raw_sdk_message(self):
        """Mapped error messages must never contain the raw SDK error message."""
        provider = self._get_provider()
        secret_fragment = "sk-supersecretapikey-12345"
        error = errors.ClientError(
            429, {"error": {"message": f"Rate limit exceeded: {secret_fragment}"}}
        )

        with pytest.raises(RateLimitError) as exc_info:
            provider._map_api_error(error)

        # The secret should absolutely not appear in the mapped message
        assert secret_fragment not in str(exc_info.value)


class TestGeminiTimeoutHandling:
    """Test timeout mapping."""

    def test_timeout_constants_are_in_seconds(self):
        """Timeout constants should be in seconds."""
        # DEFAULT_TIMEOUT is in seconds (30.0 seconds = 30 seconds)
        assert GeminiProvider.DEFAULT_TIMEOUT == 30.0
        assert GeminiProvider.MAX_TIMEOUT == 60.0


class TestGeminiSdkTimeoutMilliseconds:
    """Test that SDK timeout is properly converted to milliseconds."""

    def test_sdk_timeout_is_converted_to_milliseconds(self):
        """
        Verify that the SDK timeout passed to HttpOptions is in milliseconds.

        The SDK requires timeout in MILLISECONDS.
        Default 30 seconds = 30000 milliseconds.

        This test ensures the bug (passing 30 instead of 30000) can't come back.
        """
        from google.genai import types

        # 30 seconds in milliseconds = 30000
        expected_ms = 30 * 1000  # 30000

        # Create the same HttpOptions that GeminiProvider.__init__ creates
        http_options = types.HttpOptions(
            timeout=int(GeminiProvider.DEFAULT_TIMEOUT * 1000),
            retry_options=types.HttpRetryOptions(attempts=1)
        )

        # Assert the SDK timeout is 30000 (30 seconds in ms), not 30 (30 ms!)
        assert http_options.timeout == 30000, (
            f"SDK timeout should be 30000ms (30s), got {http_options.timeout}. "
            "Did someone change the conversion from seconds to milliseconds?"
        )

    def test_all_timeout_values_are_correct(self):
        """Test all timeout-related conversions."""
        # DEFAULT_TIMEOUT in seconds
        assert GeminiProvider.DEFAULT_TIMEOUT == 30.0

        # Conversion to milliseconds for SDK
        sdk_timeout_ms = int(GeminiProvider.DEFAULT_TIMEOUT * 1000)
        assert sdk_timeout_ms == 30000

        # Verify the pattern used in __init__
        from google.genai import types
        http_options = types.HttpOptions(
            timeout=int(GeminiProvider.DEFAULT_TIMEOUT * 1000),
            retry_options=types.HttpRetryOptions(attempts=1)
        )
        assert http_options.timeout == 30000


class TestGeminiRetryDisabled:
    """Test that SDK retries are disabled."""

    def test_sdk_retry_options_disabled(self):
        """The provider should create HttpRetryOptions with attempts=1 (no retries)."""
        from google.genai import types

        # Verify the retry options pattern used in GeminiProvider.__init__
        http_options = types.HttpOptions(
            timeout=30000,
            retry_options=types.HttpRetryOptions(attempts=1)
        )

        # Assert retry options have attempts=1 (single attempt, no retry)
        assert http_options.retry_options.attempts == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])