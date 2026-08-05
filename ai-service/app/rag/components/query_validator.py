import re
import logging
from app.rag.exceptions import ValidationError
from app.core.config.settings import settings

logger = logging.getLogger("app")

# Patterns that suggest prompt-injection attempts
_INJECTION_PATTERNS = [
    re.compile(r"ignore (all |previous |above )?instructions?", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"<\|.*?\|>"),           # instruction tokens e.g. <|im_start|>
    re.compile(r"\x00"),                # null bytes
]

_MAX_QUERY_LENGTH: int = 1000


class QueryValidator:
    """
    Validates the raw user query before it enters the pipeline.

    Guards:
        • Non-empty / not whitespace-only
        • Does not exceed maximum length
        • Does not contain null bytes or known injection patterns
    """

    def validate(self, query: str) -> None:
        """
        Raises ValidationError if the query fails any guard.
        Returns None on success (caller continues).
        """
        if not query or not query.strip():
            raise ValidationError("query", "Query must not be empty.")

        if len(query) > _MAX_QUERY_LENGTH:
            raise ValidationError(
                "query",
                f"Query exceeds maximum length of {_MAX_QUERY_LENGTH} characters "
                f"(received {len(query)}).",
            )

        for pattern in _INJECTION_PATTERNS:
            if pattern.search(query):
                raise ValidationError(
                    "query",
                    "Query contains disallowed content or patterns.",
                )

        logger.debug("QueryValidator: Query passed all validation guards.")
