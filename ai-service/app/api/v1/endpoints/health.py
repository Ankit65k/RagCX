import time
from fastapi import APIRouter, Depends
from dependency_injector.wiring import inject, Provide
from redis.asyncio import Redis
from httpx import AsyncClient

from app.core.container import Container
from app.core.config import settings

router = APIRouter()

START_TIME = time.time()


@router.get("/health", tags=["health"])
@inject
async def get_health(
    redis_client: Redis = Depends(Provide[Container.redis_client]),
    http_client: AsyncClient = Depends(Provide[Container.http_client]),
):
    # 1. Ping Redis
    try:
        redis_ok = await redis_client.ping()
        redis_status = "connected" if redis_ok else "unhealthy"
    except Exception:
        redis_status = "disconnected"

    # 2. Ping Ollama endpoint (placeholder connectivity verification)
    try:
        response = await http_client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
        ollama_status = "connected" if response.status_code == 200 else f"error {response.status_code}"
    except Exception:
        ollama_status = "disconnected"

    uptime_seconds = round(time.time() - START_TIME, 2)

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "uptime": f"{uptime_seconds}s",
        "environment": settings.APP_ENV,
        "services": {
            "redis": redis_status,
            "ollama": ollama_status,
        },
    }
