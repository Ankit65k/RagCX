from pydantic import BaseModel


class LangGraphConfig(BaseModel):
    """
    State machine execution flow settings for LangGraph workflows.
    """
    LANGGRAPH_RECURSION_LIMIT: int = 25
    LANGGRAPH_MAX_ITERATIONS: int = 10
    LANGGRAPH_MEMORY_WINDOW: int = 5
    LANGGRAPH_CHECKPOINT_ENABLED: bool = True
    # Future Graph Builder checkpoint or configuration parameters
