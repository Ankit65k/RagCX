import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.factory import create_llm_provider
from app.models.fallback import FallbackProvider
from app.models.ollama import OllamaProvider
from app.models.gemini import GeminiProvider, AuthenticationError


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx AsyncClient."""
    return AsyncMock()


class TestFactoryOllamaProvider:
    """Test factory with LLM_PROVIDER=ollama."""

    def test_ollama_provider_returns_directly(self, mock_httpx_client):
        """When LLM_PROVIDER=ollama, return OllamaProvider directly."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "ollama"

            provider = create_llm_provider(mock_httpx_client)

            assert isinstance(provider, OllamaProvider)
            assert not isinstance(provider, FallbackProvider)

    def test_ollama_provider_case_insensitive(self, mock_httpx_client):
        """LLM_PROVIDER should be case-insensitive."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "OLLAMA"

            provider = create_llm_provider(mock_httpx_client)

            assert isinstance(provider, OllamaProvider)


class TestFactoryGeminiProvider:
    """Test factory with LLM_PROVIDER=gemini."""

    def test_gemini_with_valid_config_returns_fallback_provider(self, mock_httpx_client):
        """Valid Gemini config returns FallbackProvider."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_FALLBACK_MODEL = "gemini-1.5-pro"
            mock_settings.OLLAMA_CHAT_MODEL = "llama3.2:1b"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_primary = MagicMock()
                mock_fallback = MagicMock()
                mock_gemini_class.side_effect = [mock_primary, mock_fallback]

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, FallbackProvider)
                assert provider.primary is mock_primary
                assert provider.fallback is mock_fallback

    def test_gemini_missing_api_key_falls_back_to_ollama(self, mock_httpx_client):
        """Missing GEMINI_API_KEY falls back to Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = ""
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"

            provider = create_llm_provider(mock_httpx_client)

            assert isinstance(provider, OllamaProvider)
            assert not isinstance(provider, FallbackProvider)

    def test_gemini_missing_model_falls_back_to_ollama(self, mock_httpx_client):
        """Missing GEMINI_MODEL falls back to Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = ""

            provider = create_llm_provider(mock_httpx_client)

            assert isinstance(provider, OllamaProvider)
            assert not isinstance(provider, FallbackProvider)

    def test_gemini_none_api_key_falls_back_to_ollama(self, mock_httpx_client):
        """None GEMINI_API_KEY falls back to Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = None
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"

            provider = create_llm_provider(mock_httpx_client)

            assert isinstance(provider, OllamaProvider)

    def test_gemini_authentication_error_falls_back_to_ollama(self, mock_httpx_client):
        """GeminiProvider raises AuthenticationError on creation -> fall back to Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "invalid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_gemini_class.side_effect = AuthenticationError("Invalid API key")

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, OllamaProvider)
                assert not isinstance(provider, FallbackProvider)

    def test_gemini_unexpected_error_on_creation_falls_back_to_ollama(self, mock_httpx_client):
        """Unexpected error creating GeminiProvider -> fall back to Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_gemini_class.side_effect = RuntimeError("Unexpected error")

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, OllamaProvider)

    def test_gemini_fallback_model_creation_failure_continues(self, mock_httpx_client):
        """Fallback model creation failure continues with primary only."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_FALLBACK_MODEL = "gemini-1.5-pro"
            mock_settings.OLLAMA_CHAT_MODEL = "llama3.2:1b"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_primary = MagicMock()
                mock_gemini_class.side_effect = [mock_primary, RuntimeError("Fallback error")]

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, FallbackProvider)
                assert provider.primary is mock_primary
                assert provider.fallback is None  # Failed to create

    def test_gemini_no_fallback_model_configured(self, mock_httpx_client):
        """No fallback model configured -> FallbackProvider with fallback=None."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_FALLBACK_MODEL = ""
            mock_settings.OLLAMA_CHAT_MODEL = "llama3.2:1b"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_primary = MagicMock()
                mock_gemini_class.return_value = mock_primary

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, FallbackProvider)
                assert provider.primary is mock_primary
                assert provider.fallback is None

    def test_gemini_fallback_same_as_primary_skipped(self, mock_httpx_client):
        """Fallback model same as primary is skipped."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_FALLBACK_MODEL = "gemini-2.0-flash"  # Same as primary
            mock_settings.OLLAMA_CHAT_MODEL = "llama3.2:1b"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_primary = MagicMock()
                mock_gemini_class.return_value = mock_primary

                provider = create_llm_provider(mock_httpx_client)

                assert isinstance(provider, FallbackProvider)
                assert provider.fallback is None  # Not created


class TestFactoryInvalidProvider:
    """Test factory with invalid LLM_PROVIDER."""

    def test_invalid_provider_raises_error(self, mock_httpx_client):
        """Invalid LLM_PROVIDER raises ValueError."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "mistral"

            with pytest.raises(ValueError) as exc_info:
                create_llm_provider(mock_httpx_client)

            assert "Invalid LLM_PROVIDER" in str(exc_info.value)
            assert "mistral" in str(exc_info.value)


class TestFactoryLogging:
    """Test factory logging behavior."""

    def test_ollama_logs_info(self, mock_httpx_client):
        """Factory logs info message when using Ollama."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "ollama"

            with patch("app.models.factory.logger") as mock_logger:
                provider = create_llm_provider(mock_httpx_client)

                mock_logger.info.assert_called()
                call_args = str(mock_logger.info.call_args)
                assert "ollama" in call_args.lower()

    def test_gemini_valid_logs_info(self, mock_httpx_client):
        """Factory logs info when successfully creating Gemini providers."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = "valid-key"
            mock_settings.GEMINI_MODEL = "gemini-2.0-flash"
            mock_settings.GEMINI_FALLBACK_MODEL = "gemini-1.5-pro"
            mock_settings.OLLAMA_CHAT_MODEL = "llama3.2:1b"

            with patch("app.models.factory.GeminiProvider") as mock_gemini_class:
                mock_primary = MagicMock()
                mock_fallback = MagicMock()
                mock_gemini_class.side_effect = [mock_primary, mock_fallback]

                with patch("app.models.factory.logger") as mock_logger:
                    provider = create_llm_provider(mock_httpx_client)

                    # Should log: created primary, created fallback, and created FallbackProvider
                    assert mock_logger.info.call_count >= 3

    def test_gemini_missing_config_logs_warning(self, mock_httpx_client):
        """Factory logs warning when Gemini config is incomplete."""
        with patch("app.models.factory.settings") as mock_settings:
            mock_settings.LLM_PROVIDER = "gemini"
            mock_settings.GEMINI_API_KEY = MagicMock()
            mock_settings.GEMINI_API_KEY.get_secret_value.return_value = ""
            mock_settings.GEMINI_MODEL = ""

            with patch("app.models.factory.logger") as mock_logger:
                provider = create_llm_provider(mock_httpx_client)

                mock_logger.warning.assert_called()
                call_args = str(mock_logger.warning.call_args)
                assert "not configured" in call_args.lower()
