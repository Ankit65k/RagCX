import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError

logger = logging.getLogger("app")

_SYSTEM_INSTRUCTION = (
    "You are a precise, factual document assistant. "
    "Answer the user's question using ONLY the context provided below.\n\n"
    "CRITICAL RULES:\n"
    "1. If context is \"No context available\" or empty: answer MUST be \"No documents have been uploaded yet. Please upload documents to ask questions.\", confidence MUST be \"LOW\", citations MUST be empty array.\n"
    "2. If context exists but doesn't contain the answer: answer MUST be \"I couldn't find information about this in the uploaded documents.\", confidence MUST be \"LOW\" or \"MEDIUM\".\n"
    "3. If context contains a clear answer: provide the answer with HIGH or MEDIUM confidence and include citations.\n"
    "4. NEVER use external knowledge. NEVER speculate. NEVER invent information.\n\n"
    "You MUST respond with a valid JSON object matching this structure:\n"
    "{\n"
    "  \"answer\": \"Your direct answer based strictly on the context, OR one of the required fallback messages above\",\n"
    "  \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n"
    "  \"citations\": [\n"
    "    {\n"
    "      \"documentId\": \"The Document ID from the context block header\",\n"
    "      \"page\": <integer page number from the header>,\n"
    "      \"chunkId\": \"The Chunk ID from the header\"\n"
    "    }\n"
    "  ]\n"
    "}\n\n"
    "CONFIDENCE GUIDELINES:\n"
    "- HIGH: Answer directly stated in context with clear support\n"
    "- MEDIUM: Answer can be reasonably inferred from context\n"
    "- LOW: Context insufficient, missing, or answer not found"
)


class GeneratePromptNode(WorkflowNode):
    """
    Assembles a structured LLM prompt from the retrieved context and user query.
    Stores the formatted string in state["prompt"].
    Keeping prompt assembly in its own node makes it independently testable
    and swappable without touching the LLM call.
    """

    node_name = "generate_prompt"

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Assembling LLM prompt...")
        try:
            query = state["query"]
            retriever_result = state.get("retriever_result")
            history_messages = state.get("history_messages") or []

            context = retriever_result.context if retriever_result else "No context available."

            # Format prior history turns into text section
            history_text = ""
            if history_messages:
                turns = []
                for msg in history_messages:
                    # Avoid duplicate user query at the end
                    if msg["role"] == "user" and msg["content"] == query:
                        continue
                    role_lbl = msg["role"].upper()
                    turns.append(f"{role_lbl}: {msg['content']}")
                if turns:
                    history_text = "--- CONVERSATION HISTORY ---\n" + "\n".join(turns) + "\n\n"

            prompt = (
                f"{_SYSTEM_INSTRUCTION}\n\n"
                f"--- CONTEXT ---\n{context}\n\n"
                f"{history_text}"
                f"--- QUESTION ---\n{query}\n\n"
                f"--- ANSWER ---"
            )

            logger.info(f"[{self.node_name}] Prompt assembled ({len(prompt)} chars).")
            # Log full prompt for debugging
            logger.info(f"[{self.node_name}] FULL PROMPT:\n{prompt}")
            return {"prompt": prompt}

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
