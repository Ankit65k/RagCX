from enum import Enum
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    SYSTEM = "SYSTEM"
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    TOOL = "TOOL"


class Message(BaseModel):
    messageId: str = Field(description="Unique message identifier")
    conversationId: str = Field(description="Foreign key identifier of the conversation session")
    role: MessageRole = Field(description="Role of the message sender")
    content: str = Field(description="The text content of the message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC time the message was recorded")
    tokenCount: int = Field(default=0, description="Pre-calculated or estimated token count of the message content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata associated with the message")


class ConversationState(BaseModel):
    conversationId: str = Field(description="Unique conversation identifier")
    messages: List[Message] = Field(default_factory=list, description="Ordered sequence of messages in the conversation")
    createdTime: datetime = Field(default_factory=datetime.utcnow, description="UTC creation timestamp")
    updatedTime: datetime = Field(default_factory=datetime.utcnow, description="UTC last updated timestamp")
    lastUserMessage: Optional[str] = Field(default=None, description="Cache of the last message sent by the user")
    lastAssistantMessage: Optional[str] = Field(default=None, description="Cache of the last message sent by the assistant")
    summary: Optional[str] = Field(default=None, description="Rolling text summary of the truncated/older history")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata for the conversation context")
