from typing import List
from pydantic import BaseModel, Field


class ProcessingConfig(BaseModel):
    """
    Limits and rules constraints for document uploading and chunking.
    """
    PROC_MAX_FILE_SIZE: int = Field(default=20 * 1024 * 1024) # 20MB default
    PROC_MAX_PAGES: int = 100
    PROC_ALLOWED_EXTENSIONS: List[str] = Field(default=["pdf"])
    PROC_ALLOWED_MIME_TYPES: List[str] = Field(default=["application/pdf"])
    PROC_CONCURRENT_LIMIT: int = 3
