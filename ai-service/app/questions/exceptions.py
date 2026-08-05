class QuestionGenerationError(Exception):
    """Base exception for all question generation pipeline errors."""
    pass


class PromptBuilderError(QuestionGenerationError):
    """Raised when context formatting or prompt rendering fails."""
    pass


class ValidationError(QuestionGenerationError):
    """Raised when generated questions fail sanity or groundedness checks."""
    pass


class RankingError(QuestionGenerationError):
    """Raised when sorting/scoring logic encounters issues."""
    pass
