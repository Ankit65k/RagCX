from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ChatEventRequest(BaseModel):
    """
    Validates the structure of the incoming CHAT_REQUEST BusEvent payload.
    """
    eventId: str
    requestId: str
    correlationId: str
    conversationId: str
    userId: str
    question: str
    documentIds: List[str] = Field(default_factory=list)  # Empty = query all documents
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChatResponsePayload(BaseModel):
    """
    Structured payload sent inside the CHAT_RESPONSE BusEvent.
    """
    conversationId: str
    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: str
    executionTime: float
    model: str
    tokenUsage: Dict[str, int] = Field(default_factory=dict)


class ChatEventResponse(BaseModel):
    """
    Matches the outgoing CHAT_RESPONSE envelope format.
    """
    eventId: str
    eventType: str = "CHAT_RESPONSE"
    version: str = "1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlationId: str
    requestId: str
    payload: ChatResponsePayload


class PipelineResult(BaseModel):
    """
    Internal results of running the ChatPipeline.
    """
    success: bool
    response: Optional[ChatEventResponse] = None
    error_message: Optional[str] = None
