import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError
from app.models.ollama import OllamaProvider
from app.rag.models import LLMStructuredResponse
from app.memory.manager import MemoryManager
from app.memory.models import MessageRole

logger = logging.getLogger("app")


class GenerateAnswerNode(WorkflowNode):
    """
    Calls the LLM via OllamaProvider to generate a grounded answer from the prompt.
    Stores the structured response fields in state and appends the assistant answer to memory.
    This is the ONLY node in the system that invokes the chat LLM.
    """

    node_name = "generate_answer"

    def __init__(self, llm_provider: OllamaProvider, memory_manager: MemoryManager) -> None:
        self.llm_provider = llm_provider
        self.memory_manager = memory_manager

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Calling LLM for answer generation...")
        try:
            prompt = state.get("prompt")
            conversation_id = state.get("conversation_id")
            if not prompt:
                raise ValueError("prompt is missing from state.")
            if not conversation_id:
                raise ValueError("conversation_id is missing from state.")

            raw_response = await self.llm_provider.chat([
                {"role": "user", "content": prompt}
            ], format="json")
            raw_response = raw_response.strip()

            # Parse and validate LLM output using Pydantic schema
            structured = LLMStructuredResponse.model_validate_json(raw_response)
            answer = structured.answer

            # Append assistant message to conversation memory
            await self.memory_manager.append_message(conversation_id, MessageRole.ASSISTANT, answer)

            logger.info(f"[{self.node_name}] Answer generated, saved to memory, and validated successfully ({len(answer)} chars).")
            return {
                "answer": answer,
                "reasoning": structured.reasoning,
                "citations": [cit.model_dump() for cit in structured.citations],
                "confidence": structured.confidence.value,
            }

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
