"""
WorkflowEngine — top-level facade for the workflow orchestration system.

This is the single entry point for all callers (event handlers, API routes, tests).
Callers never interact with the registry, builder, or executor directly.
"""

import logging
from typing import Any, Dict, Optional

from app.workflows.registry import WorkflowRegistry
from app.workflows.builder import WorkflowBuilder
from app.workflows.executor import WorkflowExecutor
from app.workflows.exceptions import InvalidWorkflowError, WorkflowExecutionError

logger = logging.getLogger("app")


class WorkflowEngine:
    """
    Facade providing a clean `execute(workflow_name, initial_state)` API.

    Internally:
        1. Looks up the workflow from the registry.
        2. Compiles the graph via the builder (with injected nodes from kwargs).
        3. Runs it to completion via the executor.
        4. Returns the final state dict.

    The engine is stateless — no graph is cached here. If caching compiled
    graphs becomes a performance requirement, add a Dict[str, CompiledGraph]
    cache inside the builder and look up before compiling.
    """

    def __init__(
        self,
        registry: WorkflowRegistry,
        builder: WorkflowBuilder,
        executor: WorkflowExecutor,
        node_kwargs: Dict[str, Any],
    ) -> None:
        self.registry = registry
        self.builder = builder
        self.executor = executor
        self._node_kwargs = node_kwargs  # All node singletons keyed by param name

    async def execute(
        self,
        workflow_name: str,
        initial_state: Dict[str, Any],
        timeout_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Compile and execute a registered workflow.

        Args:
            workflow_name:   Must be a key in WorkflowRegistry.
            initial_state:   TypedDict-compatible dict for the workflow.
            timeout_seconds: Optional hard deadline for the entire workflow.

        Returns:
            Final state dict after all nodes have executed.
        """
        # Validate registration before compilation
        self.registry.get(workflow_name)  # Raises InvalidWorkflowError if unknown

        # Compile the graph with the injected node pool
        graph = self.builder.build(workflow_name, **self._node_kwargs)

        # Execute
        return await self.executor.execute(
            graph=graph,
            initial_state=initial_state,
            workflow_name=workflow_name,
            timeout_seconds=timeout_seconds,
        )

    def registered_workflows(self) -> list:
        return self.registry.registered_names
