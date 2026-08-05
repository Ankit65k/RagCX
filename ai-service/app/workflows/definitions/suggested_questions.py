"""
Suggested Questions Workflow Definition.

Graph:
    generate_questions → END
"""

from langgraph.graph import END, StateGraph

from app.workflows.states import SuggestedQuestionsState
from app.workflows.nodes.questions.questions import GenerateQuestionsNode


def build_suggested_questions_workflow(
    questions_node: GenerateQuestionsNode,
):
    """
    Assembles and compiles the Suggested Questions StateGraph.
    Returns a CompiledGraph ready for `await graph.ainvoke(state)`.
    """
    graph = StateGraph(SuggestedQuestionsState)

    graph.add_node(GenerateQuestionsNode.node_name, questions_node)

    graph.set_entry_point(GenerateQuestionsNode.node_name)
    graph.add_edge(GenerateQuestionsNode.node_name, END)

    return graph.compile()
