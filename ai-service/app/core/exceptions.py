class AIServiceError(Exception):
    """Base Exception for all AI Service Errors."""
    pass


class UnknownEventError(AIServiceError):
    """Raised when an unrecognized event type is received."""
    pass


class InvalidEventError(AIServiceError):
    """Raised when the event payload or metadata is structurally malformed."""
    pass


class WorkerConnectionError(AIServiceError):
    """Raised when connections to Redis are lost and fail reconnection."""
    pass


class MessageValidationError(AIServiceError):
    """Raised when Pydantic parsing of event payloads fails."""
    pass


class HandlerExecutionError(AIServiceError):
    """Raised when an event handler callback execution throws."""
    pass
