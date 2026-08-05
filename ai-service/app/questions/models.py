from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SuggestedQuestion(BaseModel):
    questionId: str = Field(description="Unique identifier for the suggested question")
    question: str = Field(description="The generated question text, grounded in document content")
    confidence: ConfidenceLevel = Field(description="Grounded confidence level in the relevance and validity of the question")
    relatedPages: List[int] = Field(description="List of document page numbers relevant to the question")
    relatedChunkIds: Optional[List[str]] = Field(default=None, description="List of document chunk IDs that ground the question")


class QuestionGenerationResult(BaseModel):
    questions: List[SuggestedQuestion] = Field(description="List of generated suggested questions")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata about the generation run")


class LLMQuestionItem(BaseModel):
    question: str = Field(description="The question text itself")
    related_pages: List[int] = Field(description="Page numbers supporting this question")
    confidence: ConfidenceLevel = Field(description="Confidence score for this specific question")


class LLMQuestionsResponse(BaseModel):
    questions: List[LLMQuestionItem] = Field(description="Array of questions generated from document chunks")
