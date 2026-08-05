"""
Chat Workflow Definition.

Graph:
    retrieve_context → generate_prompt → generate_answer → END
"""

from langgraph.graph import END, StateGraph

from app.workflows.states import ChatWorkflowState
from app.workflows.nodes.chat.retrieve import RetrieveContextNode
from app.workflows.nodes.chat.prompt import GeneratePromptNode
from app.workflows.nodes.chat.answer import GenerateAnswerNode


def build_chat_workflow(
    retrieve_node: RetrieveContextNode,
    prompt_node: GeneratePromptNode,
    answer_node: GenerateAnswerNode,
):
    """
    Assembles and compiles the Chat StateGraph.
    Returns a CompiledGraph ready for `await graph.ainvoke(state)`.
    """
    graph = StateGraph(ChatWorkflowState)

    graph.add_node(RetrieveContextNode.node_name, retrieve_node)
    graph.add_node(GeneratePromptNode.node_name, prompt_node)
    graph.add_node(GenerateAnswerNode.node_name, answer_node)

    graph.set_entry_point(RetrieveContextNode.node_name)

    graph.add_edge(RetrieveContextNode.node_name, GeneratePromptNode.node_name)
    graph.add_edge(GeneratePromptNode.node_name, GenerateAnswerNode.node_name)
    graph.add_edge(GenerateAnswerNode.node_name, END)

    return graph.compile()
