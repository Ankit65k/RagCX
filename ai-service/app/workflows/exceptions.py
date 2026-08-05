class WorkflowError(Exception):
    """Base exception for all workflow operations."""
    pass


class WorkflowExecutionError(WorkflowError):
    """Raised when a workflow fails to execute to completion."""
    pass


class NodeExecutionError(WorkflowError):
    """Raised when a specific graph node raises an unhandled exception."""

    def __init__(self, node_name: str, message: str) -> None:
        self.node_name = node_name
        super().__init__(f"Node '{node_name}' failed: {message}")


class InvalidWorkflowError(WorkflowError):
    """Raised when a requested workflow name is not registered."""
    pass


class StateValidationError(WorkflowError):
    """Raised when the workflow state is missing required fields on entry or exit."""
    pass
