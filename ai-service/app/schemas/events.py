from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, model_validator


class BusEvent(BaseModel):
    """
    Standard event envelope matching the Backend EventBus format.
    """
    eventId: str
    eventType: str
    version: str = "1.0"
    timestamp: str
    correlationId: str
    requestId: str
    producer: str = "ragcx-backend"
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode='before')
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "type" in data and "eventType" not in data:
                data["eventType"] = data["type"]
            if "requestId" in data:
                if "eventId" not in data:
                    data["eventId"] = f"e-{data['requestId']}"
                if "correlationId" not in data:
                    data["correlationId"] = data["requestId"]
        return data


# ─── Payload Models ──────────────────────────────────────────────────────────

class DocumentUploadedPayload(BaseModel):
    documentId: str
    storagePath: str
    mimeType: str
    checksum: str
    fileSize: int
    uploadedBy: str


class DocumentReprocessPayload(BaseModel):
    documentId: str
    storagePath: Optional[str] = None
    requestedBy: str
    requestedAt: str


class ChatRequestPayload(BaseModel):
    chatSessionId: str
    prompt: str
    history: Optional[list] = None # type: ignore
