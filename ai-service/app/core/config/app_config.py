from typing import List, Literal
from pydantic import BaseModel, Field, field_validator


class AppConfig(BaseModel):
    """
    Core FastAPI application settings.
    """
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "ragcx-ai-service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = Field(default=["*"])
    TIMEZONE: str = "UTC"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
