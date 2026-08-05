import logging
from typing import List, Dict, Optional
from app.memory.models import Message, MessageRole

logger = logging.getLogger("app")


class HistoryManager:
    """
    Manages formatting, retrieval, and injection of rolling summaries
    into active message histories for downstream models.
    """

    def format_history_for_llm(self, messages: List[Message], summary: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Formats active messages into a LangChain/Ollama chat message structure,
        injecting the rolling summary as context at the beginning if present.
        """
        formatted = []

        # 1. Inject summary as system/user context at the top of the history
        if summary:
            summary_message = (
                f"--- CONVERSATION SUMMARY ---\n"
                f"Here is a summary of the older part of this conversation:\n"
                f"{summary}\n"
                f"Use this summary as context for the questions/history below.\n"
                f"----------------------------"
            )
            formatted.append({"role": "system", "content": summary_message})

        # 2. Append active messages
        role_mapping = {
            MessageRole.SYSTEM: "system",
            MessageRole.USER: "user",
            MessageRole.ASSISTANT: "assistant",
            MessageRole.TOOL: "system", # Map TOOL to system or developer
        }

        for msg in messages:
            role = role_mapping.get(msg.role, "user")
            formatted.append({"role": role, "content": msg.content})

        logger.debug(f"HistoryManager: Formatted chat log with {len(formatted)} elements (summary injected: {bool(summary)})")
        return formatted

    def get_recent_history(self, messages: List[Message], limit: int) -> List[Message]:
        return messages[-limit:]
