import logging
from typing import List, Optional
from app.models.base import LLMProvider
from app.memory.models import Message
from app.memory.exceptions import SummaryGenerationError

logger = logging.getLogger("app")

_SUMMARIZE_PROMPT_TEMPLATE = """\
You are an expert conversation analyst. Update the running summary of this conversation by incorporating the new messages below.

--- RUNNING SUMMARY ---
{running_summary}

--- NEW MESSAGES TO INCORPORATE ---
{messages_text}

--- INSTRUCTIONS ---
Generate a updated running summary.
- You MUST preserve all key facts, user intent, conversation goals, and referenced documents.
- Keep the summary concise (under 250 words) and factual.
- Return ONLY the updated summary text. Do not add any introductory or concluding comments.
"""


class ConversationSummarizer:
    """
    Summarizes conversational history segments when limits are exceeded.
    Integrates with the injected LLMProvider.
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None) -> None:
        self.llm_provider = llm_provider

    def _format_messages(self, messages: List[Message]) -> str:
        lines = []
        for m in messages:
            lines.append(f"{m.role.value}: {m.content}")
        return "\n".join(lines)

    async def summarize(self, messages: List[Message], existing_summary: Optional[str] = None) -> str:
        logger.info(f"ConversationMemory: Summarization started for {len(messages)} messages.")
        if not messages:
            return existing_summary or ""

        running_summary = existing_summary or "No summary exists yet."
        messages_text = self._format_messages(messages)

        prompt = _SUMMARIZE_PROMPT_TEMPLATE.format(
            running_summary=running_summary,
            messages_text=messages_text,
        )

        if not self.llm_provider:
            logger.warning("ConversationMemory: No LLMProvider injected for summarizer. Using heuristic fallback.")
            return self._heuristic_fallback(messages, existing_summary)

        try:
            summary = await self.llm_provider.chat([
                {"role": "user", "content": prompt}
            ])
            summary = summary.strip()
            logger.info("ConversationMemory: Summary generated successfully.")
            return summary
        except Exception as e:
            logger.error(f"ConversationMemory: Summary generation failed: {str(e)}. Falling back to heuristic summary.")
            return self._heuristic_fallback(messages, existing_summary)

    def _heuristic_fallback(self, messages: List[Message], existing_summary: Optional[str] = None) -> str:
        # Heuristic fallback: join intents / key messages
        prefix = f"{existing_summary}\n" if existing_summary else ""
        highlights = []
        for m in messages:
            if len(m.content) > 30:
                highlights.append(f"[{m.role.value}] {m.content[:80]}...")
        
        fallback = prefix + " -> ".join(highlights)
        return fallback[:1000] # Cap fallback size
