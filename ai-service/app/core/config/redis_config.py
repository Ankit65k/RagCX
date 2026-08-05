from pydantic import BaseModel, Field


class RedisConfig(BaseModel):
    """
    Configuration parameters for Redis Pub/Sub connections.
    """
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_DB: int = 0
    REDIS_RECONNECT_RETRIES: int = 5
    REDIS_HEALTH_TIMEOUT: float = 2.0
