"""
WorkflowBuilder — compiles a named workflow from the registry by injecting nodes.
"""

import logging
from typing import Any, Dict

from app.workflows.registry import WorkflowRegistry
from app.workflows.exceptions import WorkflowExecutionError

logger = logging.getLogger("app")


class WorkflowBuilder:
    """
    Resolves a workflow name from the registry and calls its builder function
    with the provided node keyword arguments, returning a compiled LangGraph graph.

    Keeping compilation separate from execution allows future caching of
    compiled graphs (expensive for large graphs) without touching the executor.
    """

    def __init__(self, registry: WorkflowRegistry) -> None:
        self.registry = registry

    def build(self, workflow_name: str, **node_kwargs: Any):
        """
        Compiles the named workflow by calling its registered builder function.

        Args:
            workflow_name: Key registered in WorkflowRegistry.
            **node_kwargs:  Injected node instances forwarded to the builder fn.

        Returns:
            A LangGraph CompiledGraph.
        """
        try:
            builder_fn = self.registry.get(workflow_name)
            logger.info(f"Builder: Compiling workflow '{workflow_name}'...")
            graph = builder_fn(**node_kwargs)
            return graph
        except Exception as e:
            raise WorkflowExecutionError(
                f"Failed to compile workflow '{workflow_name}': {str(e)}"
            ) from e
