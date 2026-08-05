import re
import logging

logger = logging.getLogger("app")

_WHITESPACE_RUN = re.compile(r"\s+")


class QueryNormalizer:
    """
    Normalises a validated query before embedding and retrieval.

    Operations (in order):
        1. Strip leading/trailing whitespace
        2. Collapse internal whitespace runs to a single space
        3. Strip leading punctuation that adds no semantic value (e.g. "?" alone)

    Deliberately does NOT lowercase — embedding models are case-aware and
    proper nouns / acronyms carry meaning.
    """

    def normalize(self, query: str) -> str:
        normalized = query.strip()
        normalized = _WHITESPACE_RUN.sub(" ", normalized)

        logger.debug(f"QueryNormalizer: '{query[:60]}' → '{normalized[:60]}'")
        return normalized
