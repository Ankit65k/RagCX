import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError

logger = logging.getLogger("app")

_SYSTEM_INSTRUCTION = (
    "You are a precise, factual document assistant. "
    "Answer the user's question using ONLY the context provided below.\n\n"
    "You MUST respond with a valid JSON object matching the following structure:\n"
    "{\n"
    "  \"answer\": \"Your direct answer based strictly on the context. If context is insufficient, set this exactly to: 'I couldn\\'t find relevant information in the uploaded documents.'\",\n"
    "  \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n"
    "  \"citations\": [\n"
    "    {\n"
    "      \"documentId\": \"The Document ID from the matching context block header\",\n"
    "      \"page\": <integer page number from the header>,\n"
    "      \"chunkId\": \"The Chunk ID from the header\"\n"
    "    }\n"
    "  ],\n"
    "  \"reasoning\": \"Step-by-step internal reasoning justifying the answer and confidence assessment\"\n"
    "}\n\n"
    "Do not speculate, invent citations, or use external knowledge."
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
            return {"prompt": prompt}

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
