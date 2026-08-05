"""
WorkflowRegistry — maps workflow names to their graph builder callables.

Extension contract:
    1. Create a new definition file in app/workflows/definitions/.
    2. Add an entry to WORKFLOW_NAMES and register in WorkflowRegistry.__init__.
    3. No changes needed in the engine, executor, or builder.
"""

from typing import Callable, Dict
from app.workflows.exceptions import InvalidWorkflowError


class WorkflowNames:
    DOCUMENT_PROCESSING = "document_processing"
    CHAT = "chat"
    SUGGESTED_QUESTIONS = "suggested_questions"


class WorkflowRegistry:
    """
    Immutable registry mapping workflow names to their compiled graph builder functions.
    Builder callables accept the injected node instances and return a CompiledGraph.
    """

    def __init__(self) -> None:
        self._registry: Dict[str, Callable] = {}

    def register(self, name: str, builder_fn: Callable) -> None:
        self._registry[name] = builder_fn

    def get(self, name: str) -> Callable:
        builder = self._registry.get(name)
        if builder is None:
            valid = list(self._registry.keys())
            raise InvalidWorkflowError(
                f"Workflow '{name}' is not registered. Valid workflows: {valid}"
            )
        return builder

    @property
    def registered_names(self) -> list:
        return list(self._registry.keys())
