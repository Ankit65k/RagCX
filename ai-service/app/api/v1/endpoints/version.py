from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/version", tags=["version"])
async def get_version():
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }
