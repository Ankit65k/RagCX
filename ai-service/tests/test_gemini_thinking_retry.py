"""
Test Gemini provider thinking retry logic.

Tests that 400 errors with thinking enabled are retried without thinking config,
and that other errors (429, 400 without thinking) do not retry.
"""
import asyncio

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from google.genai import errors

from app.models.gemini import GeminiProvider, LLMProviderError, RateLimitError


class TestGeminiThinkingRetry:
    """Test thinking config retry behavior in GeminiProvider."""

    @patch('google.genai.Client')
    def test_chat_retry_on_400_with_thinking_enabled(self, mock_genai_client):
        """chat(): 400 error with thinking enabled should retry without thinking config."""
        # Setup mocks
        mock_async_client = AsyncMock()
        mock_genai_client.return_value.aio = mock_async_client

        # Track configs at call time with snapshots
        call_count = 0
        recorded_snapshots = []

        async def fake_generate_content(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            cfg = kwargs.get('config')
            recorded_snapshots.append({
                "thinking": cfg.thinking_config,
                "mime": cfg.response_mime_type
            })

            if call_count == 1:
                raise errors.ClientError(400, {"error": {"message": "x"}})

            response = MagicMock()
            response.candidates = [
                MagicMock(content=MagicMock(parts=[MagicMock(text="ok")]))
            ]
            response.usage_metadata = None
            return response

        mock_async_client.models.generate_content = fake_generate_content

        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            provider = GeminiProvider(model="gemini-2.0-flash")
            result = asyncio.run(provider.chat([
                {"role": "user", "content": "test message"}
            ]))

        # Assert result is "ok"
        assert result == "ok"

        # Assert generate_content was called exactly twice
        assert call_count == 2

        # Assert on snapshots: first call thinking is not None
        assert recorded_snapshots[0]["thinking"] is not None

        # Assert on snapshots: second call thinking is None
        assert recorded_snapshots[1]["thinking"] is None

    @patch('google.genai.Client')
    def test_chat_json_format_retry_preserves_response_mime_type(self, mock_genai_client):
        """chat(format='json'): retry should preserve response_mime_type."""
        # Setup mocks
        mock_async_client = AsyncMock()
        mock_genai_client.return_value.aio = mock_async_client

        # Track configs at call time with snapshots
        call_count = 0
        recorded_snapshots = []

        async def fake_generate_content(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            cfg = kwargs.get('config')
            recorded_snapshots.append({
                "thinking": cfg.thinking_config,
                "mime": cfg.response_mime_type
            })

            if call_count == 1:
                raise errors.ClientError(400, {"error": {"message": "x"}})

            response = MagicMock()
            response.candidates = [
                MagicMock(content=MagicMock(parts=[MagicMock(text="ok")]))
            ]
            response.usage_metadata = None
            return response

        mock_async_client.models.generate_content = fake_generate_content

        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            provider = GeminiProvider(model="gemini-2.0-flash")
            result = asyncio.run(provider.chat(
                [{"role": "user", "content": "test message"}],
                format="json"
            ))

        # Assert result is "ok"
        assert result == "ok"

        # Assert generate_content was called exactly twice
        assert call_count == 2

        # Assert on snapshots: second call mime == "application/json"
        assert recorded_snapshots[1]["mime"] == "application/json"

    @patch('google.genai.Client')
    def test_400_without_thinking_level_does_not_retry(self, mock_genai_client):
        """400 error with empty thinking level must NOT retry."""
        # Setup mocks
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Call raises 400 error
        error = errors.ClientError(400, {"error": {"message": "x"}})
        mock_model.side_effect = error

        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = ""

            provider = GeminiProvider(model="gemini-2.0-flash")

            with pytest.raises(LLMProviderError):
                asyncio.run(provider.chat([
                    {"role": "user", "content": "test message"}
                ]))

        # Assert generate_content was called exactly once (no retry)
        assert mock_model.call_count == 1

    @patch('google.genai.Client')
    def test_429_does_not_retry(self, mock_genai_client):
        """429 error must NOT retry."""
        # Setup mocks
        mock_async_client = AsyncMock()
        mock_model = AsyncMock()

        mock_genai_client.return_value.aio = mock_async_client
        mock_async_client.models.generate_content = mock_model

        # Call raises 429 error
        error = errors.ClientError(429, {"error": {"message": "rate limited"}})
        mock_model.side_effect = error

        with patch('app.models.gemini.settings') as mock_settings:
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "test-key"
            mock_settings.GEMINI_PER_ATTEMPT_CAP = 20.0
            mock_settings.GEMINI_MAX_OUTPUT_TOKENS = 1500
            mock_settings.GEMINI_THINKING_LEVEL = "minimal"

            provider = GeminiProvider(model="gemini-2.0-flash")

            with pytest.raises(RateLimitError):
                asyncio.run(provider.chat([
                    {"role": "user", "content": "test message"}
                ]))

        # Assert generate_content was called exactly once (no retry)
        assert mock_model.call_count == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
