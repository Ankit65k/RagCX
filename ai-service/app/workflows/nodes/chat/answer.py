import logging
import time
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
        llm_start = time.perf_counter()
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

            llm_total_ms = (time.perf_counter() - llm_start) * 1000
            logger.info(f"[{self.node_name}] LLM call completed in {llm_total_ms:.1f}ms total")

            # Log detailed Ollama metrics
            metrics = self.llm_provider.last_metrics
            if metrics:
                logger.info(
                    f"[{self.node_name}] TIMING BREAKDOWN:\n"
                    f"  Retrieval (from state): {state.get('retrieval_time_ms', 'N/A')}\n"
                    f"  LLM Total: {llm_total_ms:.1f}ms\n"
                    f"    - Model Load: {metrics.get('load_duration_ms', 0):.1f}ms\n"
                    f"    - Prompt Eval: {metrics.get('prompt_eval_duration_ms', 0):.1f}ms ({metrics.get('prompt_tokens', 0)} tokens)\n"
                    f"    - Generation: {metrics.get('eval_duration_ms', 0):.1f}ms ({metrics.get('generated_tokens', 0)} tokens)"
                )

            # Log raw LLM response for debugging
            logger.info(f"[{self.node_name}] RAW LLM RESPONSE:\n{raw_response}")

            # Try to parse and validate LLM output using Pydantic schema
            try:
                structured = LLMStructuredResponse.model_validate_json(raw_response)
                answer = structured.answer
                confidence = structured.confidence.value
                citations = [cit.model_dump() for cit in structured.citations]

                # Append assistant message to conversation memory
                await self.memory_manager.append_message(conversation_id, MessageRole.ASSISTANT, answer)

                logger.info(f"[{self.node_name}] Answer generated, saved to memory, and validated successfully ({len(answer)} chars).")
                return {
                    "answer": answer,
                    "citations": citations,
                    "confidence": confidence,
                }
            except Exception as parse_err:
                # JSON parsing failed - try to salvage the answer field
                logger.warning(f"[{self.node_name}] JSON parsing failed: {str(parse_err)}")

                try:
                    # Attempt to extract answer from truncated JSON
                    import json
                    # Try to find "answer" field in raw response
                    if '"answer"' in raw_response:
                        # Find the answer field and extract until the next closing quote or field
                        start_idx = raw_response.find('"answer"')
                        if start_idx != -1:
                            # Find the colon after "answer"
                            colon_idx = raw_response.find(':', start_idx)
                            if colon_idx != -1:
                                # Find the opening quote of the answer value
                                quote_idx = raw_response.find('"', colon_idx)
                                if quote_idx != -1:
                                    # Find the closing quote (accounting for escaped quotes)
                                    end_idx = quote_idx + 1
                                    while end_idx < len(raw_response):
                                        if raw_response[end_idx] == '"' and raw_response[end_idx-1] != '\\':
                                            break
                                        end_idx += 1

                                    salvaged_answer = raw_response[quote_idx+1:end_idx]
                                    # Unescape the answer
                                    salvaged_answer = salvaged_answer.replace('\\"', '"').replace('\\n', '\n')

                                    # Append assistant message to conversation memory
                                    await self.memory_manager.append_message(conversation_id, MessageRole.ASSISTANT, salvaged_answer)

                                    logger.warning(f"[{self.node_name}] Salvaged answer from truncated JSON ({len(salvaged_answer)} chars): {salvaged_answer[:100]}...")
                                    return {
                                        "answer": salvaged_answer,
                                        "citations": [],
                                        "confidence": "LOW",  # Mark as low confidence due to truncation
                                    }
                except Exception as salvage_err:
                    logger.error(f"[{self.node_name}] Failed to salvage answer: {str(salvage_err)}")

                # If we can't salvage, return the raw response as-is with LOW confidence
                logger.error(f"[{self.node_name}] Using raw response as fallback (truncation detected)")

                # Append assistant message to conversation memory
                await self.memory_manager.append_message(conversation_id, MessageRole.ASSISTANT, raw_response)

                return {
                    "answer": raw_response,
                    "citations": [],
                    "confidence": "LOW",  # Mark as low confidence due to parsing failure
                }

        except Exception as e:
            logger.error(f"[{self.node_name}] Error in answer generation: {str(e)}", exc_info=True)
            raise NodeExecutionError(self.node_name, str(e)) from e
