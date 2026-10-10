import os
import uuid
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from datetime import datetime, timezone
from redis.asyncio import Redis

from app.schemas.events import (
    BusEvent,
    DocumentUploadedPayload,
    DocumentReprocessPayload,
    ChatRequestPayload,
)
from app.redis.serializers import MessageSerializer
from app.chat.handler import ChatEventHandler
from app.vector_store.models import SearchResultItem
from app.vector_store.mapper import MetadataMapper

logger = logging.getLogger("app")


def _resolve_storage_path(storage_path: str | None) -> str:
    if not storage_path:
        raise ValueError("Storage path or filename is empty")
    
    # If storage_path is an absolute path that exists directly:
    if os.path.isabs(storage_path) and os.path.exists(storage_path):
        return storage_path
        
    filename = os.path.basename(storage_path)
    
    # Search common locations relative to the workspace:
    # E.g. "../backend/uploads"
    search_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend/uploads"))
    if not os.path.exists(search_dir):
        # fallback to project directory root
        search_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        
    logger.info(f"Searching for file '{filename}' in '{search_dir}'...")
    for root, dirs, files in os.walk(search_dir):
        if filename in files:
            resolved = os.path.join(root, filename)
            logger.info(f"Resolved file path: '{resolved}'")
            return resolved
            
    # Fallback
    fallback = os.path.join(search_dir, filename)
    logger.warning(f"File '{filename}' not found recursively. Fallback path: '{fallback}'")
    return fallback


class BaseHandler(ABC):
    """
    Abstract Event Handler defining orchestration logic.
    """

    def __init__(self, redis_client: Redis) -> None:
        self.redis_client = redis_client

    @abstractmethod
    async def handle(self, event: BusEvent) -> None:
        """
        Processes the event and publishes corresponding responses.
        """
        pass

    async def publish_response(
        self,
        event_type: str,
        payload: Dict[str, Any],
        incoming_event: BusEvent,
        channel: str = "document:jobs",
    ) -> None:
        """
        Helper publishing standard response events back to the event bus.
        """
        response_event = BusEvent(
            eventId=str(uuid.uuid4()),
            eventType=event_type,
            version="1.0",
            timestamp=datetime.now(timezone.utc).isoformat(),
            correlationId=incoming_event.correlationId,
            requestId=incoming_event.requestId,
            producer="ragcx-ai-service",
            payload=payload,
            metadata={
                "originalEventId": incoming_event.eventId,
                "originalEventType": incoming_event.eventType,
            },
        )
        serialized = MessageSerializer.serialize(response_event)
        await self.redis_client.publish(channel, serialized)


# ─── 1. Document Uploaded Handler ─────────────────────────────────────────────

class DocumentUploadedHandler(BaseHandler):
    def __init__(
        self,
        redis_client: Redis,
        document_processor: Any,
        embedding_service: Any,
        vector_store: Any,
    ) -> None:
        super().__init__(redis_client)
        self.document_processor = document_processor
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def handle(self, event: BusEvent) -> None:
        # Validate payload schema
        payload = DocumentUploadedPayload(**event.payload)
        
        logger.info(
            f"Handler: Processing document uploaded event (Doc ID: {payload.documentId})"
        )

        # 1. Publish STARTED event
        await self.publish_response(
            "DOCUMENT_PROCESSING_STARTED",
            {"documentId": payload.documentId, "status": "PROCESSING"},
            incoming_event=event,
        )

        try:
            # 2. Call Document Processing Pipeline
            resolved_path = _resolve_storage_path(payload.storagePath)
            logger.info(f"Handler: Processing file: {resolved_path}")
            result = await self.document_processor.process(resolved_path, payload.documentId)
            
            # 3. Generate embeddings
            embedding_result = await self.embedding_service.embed_chunks(result.chunks)
            
            # 4. Insert embeddings into vector store
            await self.vector_store.insert_embeddings(embedding_result)

            # 5. Publish COMPLETED event
            await self.publish_response(
                "DOCUMENT_PROCESSING_COMPLETED",
                {
                    "documentId": payload.documentId,
                    "processingStatus": "COMPLETED",
                    "pageCount": result.statistics.totalPages,
                    "chunkCount": result.statistics.totalChunks,
                    "embeddingCount": embedding_result.statistics.embeddingCount,
                    "processingTime": int(result.processingTimeMs + embedding_result.statistics.processingTimeMs),
                },
                incoming_event=event,
            )

            # 6. Trigger background question generation
            logger.info(f"Handler: Scheduling background question generation for document {payload.documentId}")
            await self.publish_response(
                "SUGGESTED_QUESTIONS_REQUEST",
                {"documentId": payload.documentId},
                incoming_event=event,
                channel="chat:jobs"
            )

            logger.info(f"Handler: Document processing succeeded (Doc ID: {payload.documentId})")

        except Exception as e:
            logger.error(
                f"Handler: Document processing pipeline failed (Doc ID: {payload.documentId}). Error: {str(e)}"
            )
            # Publish FAILED event
            await self.publish_response(
                "DOCUMENT_PROCESSING_FAILED",
                {
                    "documentId": payload.documentId,
                    "processingStatus": "FAILED",
                    "reason": str(e),
                    "failedAt": datetime.now(timezone.utc).isoformat(),
                },
                incoming_event=event,
            )


# ─── 2. Document Reprocess Handler ────────────────────────────────────────────

class DocumentReprocessHandler(BaseHandler):
    def __init__(
        self,
        redis_client: Redis,
        document_processor: Any,
        embedding_service: Any,
        vector_store: Any,
    ) -> None:
        super().__init__(redis_client)
        self.document_processor = document_processor
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    async def handle(self, event: BusEvent) -> None:
        logger.info(f"DOCUMENT_REPROCESS_REQUESTED raw payload: {event.payload}")
        payload = DocumentReprocessPayload(**event.payload)
        
        logger.info(
            f"Handler: Reprocessing document requested (Doc ID: {payload.documentId})"
        )

        # 1. Publish STARTED event
        await self.publish_response(
            "DOCUMENT_PROCESSING_STARTED",
            {"documentId": payload.documentId, "status": "PROCESSING"},
            incoming_event=event,
        )

        try:
            # 2. Clear existing embeddings first to avoid duplicate vectors
            await self.vector_store.delete_document(payload.documentId)

            # 3. Call Document Processing Pipeline
            resolved_path = _resolve_storage_path(payload.storagePath)
            logger.info(f"Handler: Processing file: {resolved_path}")
            result = await self.document_processor.process(resolved_path, payload.documentId)
            
            # 4. Generate embeddings
            embedding_result = await self.embedding_service.embed_chunks(result.chunks)
            
            # 5. Insert embeddings into vector store
            await self.vector_store.insert_embeddings(embedding_result)

            # 6. Publish COMPLETED event
            await self.publish_response(
                "DOCUMENT_PROCESSING_COMPLETED",
                {
                    "documentId": payload.documentId,
                    "processingStatus": "COMPLETED",
                    "pageCount": result.statistics.totalPages,
                    "chunkCount": result.statistics.totalChunks,
                    "embeddingCount": embedding_result.statistics.embeddingCount,
                    "processingTime": int(result.processingTimeMs + embedding_result.statistics.processingTimeMs),
                },
                incoming_event=event,
            )

        except Exception as e:
            logger.error(
                f"Handler: Document reprocessing failed (Doc ID: {payload.documentId}). Error: {str(e)}",
                exc_info=True
            )
            await self.publish_response(
                "DOCUMENT_PROCESSING_FAILED",
                {
                    "documentId": payload.documentId,
                    "processingStatus": "FAILED",
                    "reason": str(e),
                    "failedAt": datetime.now(timezone.utc).isoformat(),
                },
                incoming_event=event,
            )


# ─── 3. Chat Request Handler ──────────────────────────────────────────────────

class ChatRequestHandler(BaseHandler):
    def __init__(self, redis_client: Redis, chat_event_handler: ChatEventHandler) -> None:
        super().__init__(redis_client)
        self.chat_event_handler = chat_event_handler

    async def handle(self, event: BusEvent) -> None:
        logger.info(f"Handler: Delegating Chat request to ChatEventHandler.")
        await self.chat_event_handler.handle_event(event)


# ─── 4. Suggested Questions Handler ───────────────────────────────────────────

class SuggestedQuestionsHandler(BaseHandler):
    def __init__(self, redis_client: Redis, vector_store: Any, pipeline: Any) -> None:
        super().__init__(redis_client)
        self.vector_store = vector_store
        self.pipeline = pipeline
        self.max_retries = 1

    async def handle(self, event: BusEvent) -> None:
        payload = event.payload
        document_id = payload.get("documentId")
        correlation_id = event.correlationId
        request_id = event.requestId
        retry_count = payload.get("retryCount", 0)

        logger.info(f"[{request_id}] Handler: Generating suggested questions for document ID: {document_id} (retry: {retry_count})")

        try:
            if not document_id:
                raise ValueError("documentId is required in suggested questions payload")

            # 1. Check if document has chunks in vector store (processing completed)
            collection = await self.vector_store._get_collection()
            data = collection.get(where={"documentId": document_id})

            if not data or not data.get("documents") or len(data.get("documents", [])) == 0:
                # No chunks found - document likely still processing or failed
                logger.warning(f"[{request_id}] Handler: No chunks found for document {document_id}. Skipping generation.")
                # Return empty response to indicate no questions available
                response_payload = {
                    "documentId": document_id,
                    "questions": [],
                    "status": "NO_CHUNKS_FOUND",
                    "message": "Document is still processing or failed - no chunks available."
                }
                await self.publish_response(
                    "SUGGESTED_QUESTIONS_RESPONSE",
                    response_payload,
                    incoming_event=event,
                    channel="chat:jobs"
                )
                return

            chunks = []
            if data and data.get("documents"):
                documents = data["documents"]
                metadatas = data["metadatas"]
                ids = data["ids"]
                for i, doc_text in enumerate(documents):
                    meta = metadatas[i] if i < len(metadatas) else {}
                    cid = ids[i]
                    mapped = MetadataMapper.map_from_db(meta)
                    chunks.append(
                        SearchResultItem(
                            text=doc_text,
                            metadata=meta,
                            score=1.0,
                            documentId=mapped["documentId"] or "",
                            pageNumber=mapped["pageNumber"],
                            chunkIndex=mapped["chunkIndex"],
                        )
                    )

            # 2. Run question generation pipeline
            result = await self.pipeline.generate(chunks=chunks, count=5, request_id=request_id)

            # 3. Check if generation failed and should retry
            if result.questions == [] and result.metadata.get("status") in ["LLM_GENERATION_FAILED", "JSON_PARSE_FAILED"]:
                if retry_count < self.max_retries:
                    logger.info(f"[{request_id}] Handler: Generation failed, retrying... (attempt {retry_count + 1}/{self.max_retries})")
                    # Publish retry request
                    retry_event = BusEvent(
                        eventId=str(uuid.uuid4()),
                        eventType="SUGGESTED_QUESTIONS_REQUEST",
                        version="1.0",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        correlationId=correlation_id,
                        requestId=request_id,
                        producer="ragcx-ai-service",
                        payload={
                            "documentId": document_id,
                            "retryCount": retry_count + 1
                        },
                        metadata={}
                    )
                    await self.redis_client.publish("chat:jobs", MessageSerializer.serialize(retry_event))
                    return
                else:
                    # Max retries exceeded, return error response
                    error_msg = result.metadata.get("message", "Unknown error")
                    logger.error(f"[{request_id}] Handler: Max retries exceeded for document {document_id}")
                    response_payload = {
                        "documentId": document_id,
                        "questions": [],
                        "status": "GENERATION_FAILED",
                        "message": f"Model timed out, click Regenerate. Error: {error_msg}"
                    }
                    await self.publish_response(
                        "SUGGESTED_QUESTIONS_ERROR",
                        response_payload,
                        incoming_event=event,
                        channel="chat:jobs"
                    )
                    return

            # 4. Store questions in Redis cache by documentId
            cache_key = f"suggested_questions:{document_id}"
            questions_data = {
                "documentId": document_id,
                "questions": [
                    {
                        "id": q.questionId,
                        "question": q.question,
                        "confidence": q.confidence.value,
                        "relatedPages": q.relatedPages,
                        "relatedChunkIds": q.relatedChunkIds,
                        "generationTimeMs": result.metadata.get("execution_time_ms", 0.0)
                    }
                    for q in result.questions
                ],
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "model": result.metadata.get("modelUsed", "unknown"),
            }
            await self.redis_client.setex(
                cache_key,
                86400,  # Cache for 24 hours
                json.dumps(questions_data)
            )
            logger.info(f"[{request_id}] Handler: Cached {len(result.questions)} questions for document {document_id}")

            # 5. Publish SUGGESTED_QUESTIONS_RESPONSE back to Redis Pub/Sub
            response_payload = {
                "documentId": document_id,
                "questions": questions_data["questions"]
            }

            await self.publish_response(
                "SUGGESTED_QUESTIONS_RESPONSE",
                response_payload,
                incoming_event=event,
                channel="chat:jobs"
            )
            logger.info(f"[{request_id}] Handler: Successfully generated and published suggested questions for {document_id}")

        except Exception as e:
            logger.error(f"[{request_id}] Handler: Suggested questions generation failed. DocumentId: {document_id}, Error: {str(e)}", exc_info=True)
            await self.publish_response(
                "SUGGESTED_QUESTIONS_ERROR",
                {
                    "documentId": document_id,
                    "requestId": request_id,
                    "reason": str(e),
                    "errorType": type(e).__name__,
                },
                incoming_event=event,
                channel="chat:jobs"
            )
