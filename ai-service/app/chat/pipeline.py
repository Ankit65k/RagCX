import time
import logging
from typing import Optional
from app.chat.models import ChatEventRequest, ChatEventResponse, PipelineResult
from app.chat.conversation import ConversationManager
from app.chat.context import ChatContextBuilder
from app.chat.builder import ResponseBuilder
from app.chat.publisher import BaseResponsePublisher
from app.workflows.engine import WorkflowEngine
from app.workflows.registry import WorkflowNames
from app.chat.exceptions import ChatPipelineError, WorkflowExecutionError

logger = logging.getLogger("app")


class ChatPipeline:
    """
    Coordinates the execution of the asynchronous chat workflow.
    Responsible for context building, calling LangGraph, compiling response,
    and triggering publisher.
    """

    def __init__(
        self,
        conversation_manager: ConversationManager,
        context_builder: ChatContextBuilder,
        workflow_engine: WorkflowEngine,
        response_builder: ResponseBuilder,
        response_publisher: BaseResponsePublisher,
    ) -> None:
        self.conversation_manager = conversation_manager
        self.context_builder = context_builder
        self.workflow_engine = workflow_engine
        self.response_builder = response_builder
        self.response_publisher = response_publisher

    async def execute(self, request: ChatEventRequest) -> PipelineResult:
        start_time = time.perf_counter()
        logger.info(f"ChatPipeline: Processing query for request ID {request.requestId}")

        try:
            # 1. Load or initialize Conversation
            await self.conversation_manager.get_or_create_conversation(
                conversation_id=request.conversationId,
                metadata=request.metadata
            )

            # 2. Build initial LangGraph Workflow state
            initial_state = self.context_builder.build_workflow_state(request)

            # 3. Execute LangGraph workflow
            logger.info("ChatPipeline: Triggering LangGraph Workflow Engine...")
            try:
                final_state = await self.workflow_engine.execute(
                    WorkflowNames.CHAT,
                    initial_state
                )
            except Exception as e:
                logger.error(f"ChatPipeline: Workflow Engine execution failed. Error: {str(e)}")
                raise WorkflowExecutionError(f"Workflow execution failed: {str(e)}") from e

            # Check if there is an error in execution state
            if final_state.get("error"):
                err_msg = final_state["error"]
                logger.error(f"ChatPipeline: Workflow executed with error: {err_msg}")
                raise WorkflowExecutionError(f"Workflow returned error: {err_msg}")

            execution_time = (time.perf_counter() - start_time) * 1000.0
            logger.info(f"ChatPipeline: Workflow finished successfully in {execution_time:.2f}ms.")

            # 4. Extract outputs
            answer = final_state.get("answer")
            confidence = final_state.get("confidence") or "LOW"
            citations = final_state.get("citations") or []

            retriever_result = final_state.get("retriever_result")
            retrieved_chunks_list = []
            if retriever_result and hasattr(retriever_result, "chunks"):
                for chunk in retriever_result.chunks:
                    retrieved_chunks_list.append({
                        "chunkId": chunk.chunkId,
                        "documentId": chunk.documentId,
                        "pageNumber": chunk.pageNumber,
                        "score": chunk.score
                    })

            # Enhanced fallback with specific messages
            if not answer:
                if not retrieved_chunks_list:
                    answer = "No documents have been uploaded yet. Please upload documents to ask questions."
                    logger.warning("ChatPipeline: No answer generated and no chunks retrieved - likely empty database")
                else:
                    answer = "I couldn't find information about this in the uploaded documents."
                    logger.warning("ChatPipeline: No answer generated despite having retrieved chunks")
                confidence = "LOW"

            # 5. Assemble response event
            response_event = self.response_builder.build_response(
                request=request,
                answer=answer,
                confidence=confidence,
                citations=citations,
                execution_time_ms=execution_time,
                model="ollama", # Default configured LLM provider model representation
                retrieved_chunks=retrieved_chunks_list,
                token_usage={"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
            )

            # 6. Publish CHAT_RESPONSE back to Redis Pub/Sub
            await self.response_publisher.publish(response_event)

            return PipelineResult(success=True, response=response_event)

        except Exception as e:
            execution_time = (time.perf_counter() - start_time) * 1000.0
            logger.error(f"ChatPipeline: Encountered exception in pipeline. Error: {str(e)}")
            
            # Safe fallback: Publish clean error response event back to system
            try:
                error_response = self.response_builder.build_error_response(
                    request=request,
                    error_msg=str(e),
                    execution_time_ms=execution_time
                )
                await self.response_publisher.publish(error_response)
                return PipelineResult(success=False, response=error_response, error_message=str(e))
            except Exception as publish_err:
                logger.critical(f"ChatPipeline: Failed to publish error fallback response: {str(publish_err)}")
                return PipelineResult(success=False, error_message=f"Critical error: {str(e)}. Publish failed: {str(publish_err)}")
