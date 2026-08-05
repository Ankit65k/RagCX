"""
WorkflowNode — Abstract Base Class for all LangGraph node implementations.

Design contract:
    • Every node has a SINGLE responsibility.
    • Nodes receive a state TypedDict and return an updated copy (partial or full).
    • Nodes are callable objects (implement __call__) so LangGraph can invoke them
      directly as graph node functions.
    • Dependencies are constructor-injected — nodes never reach into global state.
    • Errors are caught inside execute() and written to state["error"] so the graph
      can route to an error edge without crashing the executor.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class WorkflowNode(ABC):
    """
    Abstract base class for all LangGraph workflow nodes.

    Extension contract:
        1. Subclass WorkflowNode.
        2. Set `node_name` to a unique snake_case identifier.
        3. Implement `execute(state)` — read from state, write to state.
        4. Register the node in the workflow definition file (definitions/).

    No changes needed to the engine, registry, builder, or executor.
    """

    node_name: str  # Subclasses MUST declare this.

    @abstractmethod
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the current state and return an updated state dict.
        Partial returns are allowed — only changed keys need to be returned;
        LangGraph will merge them with the existing state automatically.
        """
        pass

    async def __call__(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        LangGraph-compatible callable. Delegates to execute() and wraps
        unhandled exceptions into a state["error"] field so the graph can
        route to an error terminal node rather than crashing the executor.
        """
        return await self.execute(state)
