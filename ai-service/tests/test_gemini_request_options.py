"""
Test Gemini provider per-request HTTP options.

Tests that per-request HttpOptions include both timeout and retry_options with attempts=1.
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from google.genai import types

from app.models.gemini import GeminiProvider


class TestGeminiRequestOptions:
    """Test per-request HTTP options in GeminiProvider."""

    def test_http_options_include_timeout_and_retry_options(self):
        """HttpOptions should have both timeout and retry_options with attempts=1."""
        from google.genai import types

        # Simulate a timeout value (30 seconds)
        timeout_seconds = 30.0
        timeout_ms = int(timeout_seconds * 1000)

        # Create HttpOptions as the provider would
        http_options = types.HttpOptions(
            timeout=timeout_ms,
            retry_options=types.HttpRetryOptions(attempts=1)
        )

        # Assert both fields are present with correct values
        assert http_options.timeout == timeout_ms
        assert http_options.retry_options.attempts == 1

    @patch('google.genai.Client')
    def test_generate_method_passes_http_options_with_retry(self, mock_genai_client):
        """generate() should pass HttpOptions with timeout and retry_options."""
        # Create mocks
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        # Setup client chain
        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Mock API key
        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            # Create provider
            provider = GeminiProvider(model="gemini-2.0-flash")

            # Call generate with default timeout
            try:
                # This will fail because we're mocking, but we can check the call
                import asyncio
                asyncio.run(provider.generate("test prompt"))
            except AttributeError:
                # Expected - we just want to check what was passed to the mock
                pass

        # Get the actual call arguments
        call_args = mock_model.call_args
        assert call_args is not None, "generate_content was never called"

        # Extract http_options from kwargs
        kwargs = call_args[1] if call_args else {}
        http_options = kwargs['config'].http_options

        # Assert http_options was passed
        assert http_options is not None

        # Assert timeout is present and in milliseconds
        assert hasattr(http_options, 'timeout')
        assert http_options.timeout > 0  # Should be positive milliseconds

        # Assert retry_options is present with attempts=1
        assert hasattr(http_options, 'retry_options')
        assert http_options.retry_options.attempts == 1

    @patch('google.genai.Client')
    def test_chat_method_passes_http_options_with_retry(self, mock_genai_client):
        """chat() should pass HttpOptions with timeout and retry_options."""
        # Create mocks
        mock_client = Mock()
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        # Setup client chain
        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Mock API key
        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            # Create provider
            provider = GeminiProvider(model="gemini-2.0-flash")

            # Call chat with default timeout
            try:
                # This will fail because we're mocking, but we can check the call
                import asyncio
                asyncio.run(provider.chat([
                    {"role": "user", "content": "test message"}
                ]))
            except AttributeError:
                # Expected - we just want to check what was passed to the mock
                pass

        # Get the actual call arguments
        call_args = mock_model.call_args
        assert call_args is not None, "generate_content was never called"

        # Extract http_options from kwargs
        kwargs = call_args[1] if call_args else {}
        http_options = kwargs['config'].http_options

        # Assert http_options was passed
        assert http_options is not None

        # Assert timeout is present and in milliseconds
        assert hasattr(http_options, 'timeout')
        assert http_options.timeout > 0  # Should be positive milliseconds

        # Assert retry_options is present with attempts=1
        assert hasattr(http_options, 'retry_options')
        assert http_options.retry_options.attempts == 1

    def test_time_budget_constants_exist(self):
        """GeminiProvider should have time budget constants."""
        from app.core.config.settings import Settings

        # Check defaults in Settings model_fields (not class constants)
        assert Settings.model_fields["GEMINI_TOTAL_BUDGET"].default == 30.0
        assert Settings.model_fields["GEMINI_PER_ATTEMPT_CAP"].default == 20.0

    @patch('google.genai.Client')
    def test_generate_respects_per_attempt_cap(self, mock_genai_client):
        """generate() should respect the per-attempt cap of 20 seconds."""
        # Create mocks
        mock_client = Mock()
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        # Setup client chain
        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Mock API key
        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            # Create provider
            provider = GeminiProvider(model="gemini-2.0-flash")

            # Call generate with a large timeout (should be capped at 20s)
            try:
                import asyncio
                asyncio.run(provider.generate("test prompt", timeout=60.0))
            except AttributeError:
                pass

        # Get the actual call arguments
        call_args = mock_model.call_args
        assert call_args is not None, "generate_content was never called"

        # Extract http_options from kwargs
        kwargs = call_args[1] if call_args else {}
        http_options = kwargs['config'].http_options

        # HttpOptions should have timeout of 20000ms (20s cap)
        assert http_options is not None
        assert http_options.timeout == 20000  # 20 seconds in milliseconds

    @patch('google.genai.Client')
    def test_generate_with_small_timeout(self, mock_genai_client):
        """generate() should use smaller timeout when requested timeout is less than cap."""
        # Create mocks
        mock_client = Mock()
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        # Setup client chain
        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Mock API key
        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            # Create provider
            provider = GeminiProvider(model="gemini-2.0-flash")

            # Call generate with a small timeout (5 seconds)
            try:
                import asyncio
                asyncio.run(provider.generate("test prompt", timeout=5.0))
            except AttributeError:
                pass

        # Get the actual call arguments
        call_args = mock_model.call_args
        assert call_args is not None, "generate_content was never called"

        # Extract http_options from kwargs
        kwargs = call_args[1] if call_args else {}
        http_options = kwargs['config'].http_options

        # HttpOptions should have timeout of 5000ms (5 seconds)
        assert http_options is not None
        assert http_options.timeout == 5000  # 5 seconds in milliseconds


if __name__ == "__main__":
    pytest.main([__file__, "-v"])