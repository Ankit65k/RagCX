import time
from fastapi import APIRouter, Depends
from dependency_injector.wiring import inject, Provide
from redis.asyncio import Redis
from httpx import AsyncClient

from app.core.container import Container
from app.core.config import settings
from app.models.base import LLMProvider
from app.models.fallback import FallbackProvider

router = APIRouter()

START_TIME = time.time()


@router.get("/health", tags=["health"])
@inject
async def get_health(
    redis_client: Redis = Depends(Provide[Container.redis_client]),
    http_client: AsyncClient = Depends(Provide[Container.http_client]),
    llm_provider: LLMProvider = Depends(Provide[Container.llm_provider]),
):
    # 1. Ping Redis
    try:
        redis_ok = await redis_client.ping()
        redis_status = "connected" if redis_ok else "unhealthy"
    except Exception:
        redis_status = "disconnected"

    # 2. Determine effective LLM provider from the injected instance
    is_gemini_active = isinstance(llm_provider, FallbackProvider)
    ollama_is_required = not is_gemini_active

    # Build provider info
    provider_info = {}
    if is_gemini_active:
        provider_info["name"] = "gemini"
        # Add the configured Gemini model name (never the API key)
        if settings.GEMINI_MODEL:
            provider_info["model"] = settings.GEMINI_MODEL
    else:
        provider_info["name"] = "ollama"

    # 3. Check Ollama connectivity
    try:
        response = await http_client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            ollama_status = "connected"
        else:
            ollama_status = f"error {response.status_code}"
    except Exception:
        if ollama_is_required:
            ollama_status = "disconnected"
        else:
            ollama_status = "unreachable_embeddings_affected"

    uptime_seconds = round(time.time() - START_TIME, 2)

    # Determine top-level status
    if ollama_is_required and ollama_status == "disconnected":
        status = "unhealthy"
    else:
        status = "healthy"

    return {
        "status": status,
        "version": settings.APP_VERSION,
        "uptime": f"{uptime_seconds}s",
        "environment": settings.APP_ENV,
        "provider": provider_info,
        "services": {
            "redis": redis_status,
            "ollama": ollama_status,
        },
    }
