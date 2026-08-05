import logging
from app.rag.exceptions import ValidationError

logger = logging.getLogger("app")

# Fallback response indicating no information is found
_FALLBACK_PHRASE = "I couldn't find relevant information in the uploaded documents."


class AnswerValidator:
    """
    Validates the generated answer before presenting it to the user.

    Guards:
        • Non-empty / not whitespace-only
        • Gracious handling of empty results
        • Detect and allow the fallback phrase without raising validation errors
    """

    def validate(self, answer: str) -> None:
        """
        Raises ValidationError if the generated answer is invalid.
        Returns None on success.
        """
        if not answer or not answer.strip():
            raise ValidationError("answer", "Answer must not be empty.")

        # If it matches the exact fallback response, it's valid
        if _FALLBACK_PHRASE.lower() in answer.lower():
            logger.debug("AnswerValidator: Fallback answer detected and validated.")
            return

        logger.debug("AnswerValidator: Answer passed all validation checks.")
