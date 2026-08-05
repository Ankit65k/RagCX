"""
WorkflowExecutor — async execution harness for compiled LangGraph graphs.

Responsibilities:
    • Invokes graph.ainvoke(initial_state) asynchronously.
    • Measures and logs wall-clock execution time.
    • Wraps unhandled exceptions into WorkflowExecutionError.
    • Never contains business logic — pure orchestration plumbing.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from app.workflows.exceptions import WorkflowExecutionError

logger = logging.getLogger("app")


class WorkflowExecutor:
    """
    Executes a compiled LangGraph graph and returns the final state.

    Future extension points:
        • Checkpointing: pass a LangGraph MemorySaver to graph.compile(checkpointer=...)
          to enable pause/resume across sessions.
        • Timeout: wrap ainvoke in asyncio.wait_for(graph.ainvoke(...), timeout=N).
        • Cancellation: store the asyncio.Task returned by asyncio.create_task()
          and call task.cancel() from the engine's cancel() method.
    """

    async def execute(
        self,
        graph,
        initial_state: Dict[str, Any],
        workflow_name: str = "unknown",
        timeout_seconds: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Runs a compiled graph to completion.

        Args:
            graph:            A CompiledGraph from LangGraph.
            initial_state:    The initial TypedDict state.
            workflow_name:    Used only for logging context.
            timeout_seconds:  Optional execution timeout.

        Returns:
            The final state dict after all nodes have executed.
        """
        logger.info(f"Executor: Starting workflow '{workflow_name}'...")
        start = time.perf_counter()

        try:
            coro = graph.ainvoke(initial_state)
            if timeout_seconds:
                final_state = await asyncio.wait_for(coro, timeout=timeout_seconds)
            else:
                final_state = await coro

            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.info(
                f"Executor: Workflow '{workflow_name}' completed in {elapsed_ms:.1f}ms."
            )
            return final_state

        except asyncio.TimeoutError:
            raise WorkflowExecutionError(
                f"Workflow '{workflow_name}' timed out after {timeout_seconds}s."
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.error(
                f"Executor: Workflow '{workflow_name}' failed after {elapsed_ms:.1f}ms: {str(e)}"
            )
            raise WorkflowExecutionError(
                f"Workflow '{workflow_name}' failed: {str(e)}"
            ) from e
