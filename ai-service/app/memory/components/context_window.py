import logging
from typing import List, Tuple
from app.memory.models import Message

logger = logging.getLogger("app")


class ContextWindowManager:
    """
    Enforces context window limits (max_messages, max_tokens, max_characters)
    and identifies messages that need to be trimmed or summarized.
    """

    def __init__(
        self,
        max_messages: int = 20,
        max_tokens: int = 4000,
        max_characters: int = 16000,
    ) -> None:
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.max_characters = max_characters

    def estimate_tokens(self, text: str) -> int:
        # Simple robust token estimator: 1 token is roughly 4 characters
        return max(1, len(text) // 4)

    def calculate_stats(self, messages: List[Message]) -> Tuple[int, int, int]:
        msg_count = len(messages)
        token_count = sum(m.tokenCount or self.estimate_tokens(m.content) for m in messages)
        char_count = sum(len(m.content) for m in messages)
        return msg_count, token_count, char_count

    def needs_trimming(self, messages: List[Message]) -> bool:
        msg_count, token_count, char_count = self.calculate_stats(messages)
        return (
            msg_count > self.max_messages
            or token_count > self.max_tokens
            or char_count > self.max_characters
        )

    def get_trim_index(self, messages: List[Message]) -> int:
        """
        Calculates the index from which to split/trim the history.
        Returns the number of messages from the beginning (oldest) to remove/summarize
        to fit remaining messages within context limits.
        """
        if not messages:
            return 0

        # We evaluate from the end (newest) to find how many we can keep
        total_tokens = 0
        total_chars = 0
        keep_count = 0

        for msg in reversed(messages):
            tokens = msg.tokenCount or self.estimate_tokens(msg.content)
            chars = len(msg.content)

            if (
                keep_count + 1 > self.max_messages
                or total_tokens + tokens > self.max_tokens
                or total_chars + chars > self.max_characters
            ):
                break

            total_tokens += tokens
            total_chars += chars
            keep_count += 1

        if keep_count == 0:
            # Keep at least the single most recent message to prevent deadlock
            keep_count = 1

        trim_count = len(messages) - keep_count
        logger.info(
            f"ContextWindow: Checked limits. Total messages: {len(messages)}. "
            f"Trimming oldest {trim_count} messages."
        )
        return trim_count
