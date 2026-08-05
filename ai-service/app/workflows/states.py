"""
Workflow State Models — one TypedDict per workflow type.

LangGraph passes state through every node. Using separate TypedDicts
per workflow ensures a node in the Chat workflow can never accidentally
read or write a field that belongs to the Document Processing workflow.
All fields that a node may not have populated yet are typed Optional.
"""

from typing import Any, Dict, List, Optional, TypedDict

from app.embeddings.models import EmbeddingResult
from app.retrievers.models import RetrieverResult


# ---------------------------------------------------------------------------
# Document Processing Workflow State
# ---------------------------------------------------------------------------
class DocumentWorkflowState(TypedDict, total=False):
    # Input
    document_id: str
    chunks: List[Any]               # List[DocumentChunk] from PDF pipeline
    metadata: Dict[str, Any]

    # Node outputs (populated progressively)
    is_valid: bool
    validation_error: Optional[str]
    embedding_result: Optional[EmbeddingResult]
    vectors_stored: bool
    error: Optional[str]


# ---------------------------------------------------------------------------
# Chat Workflow State
# ---------------------------------------------------------------------------
class ChatWorkflowState(TypedDict, total=False):
    # Input
    query: str
    conversation_id: str            # Unique conversation session identifier
    document_id: Optional[str]      # Optional scope: restrict to one document
    top_k: int
    score_threshold: Optional[float]

    # Node outputs
    retriever_result: Optional[RetrieverResult]
    prompt: Optional[str]
    history_messages: Optional[List[Dict[str, str]]]
    answer: Optional[str]
    reasoning: Optional[str]
    citations: Optional[List[Dict[str, Any]]]
    confidence: Optional[str]
    error: Optional[str]


# ---------------------------------------------------------------------------
# Suggested Questions Workflow State
# ---------------------------------------------------------------------------
class SuggestedQuestionsState(TypedDict, total=False):
    # Input
    document_id: str
    chunks: List[Any]               # Representative chunks from the document

    # Node outputs
    suggested_questions: Optional[List[str]]
    error: Optional[str]
