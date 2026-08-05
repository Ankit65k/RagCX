from pydantic import BaseModel


class LoggingConfig(BaseModel):
    """
    Structured application log constraints.
    """
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_STRUCTURED: bool = True
    LOG_JSON: bool = True
