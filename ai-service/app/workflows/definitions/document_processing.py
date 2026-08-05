"""
Document Processing Workflow Definition.

Graph:
    validate_document → [invalid] → END (with error)
                      → [valid]   → generate_embeddings → store_vectors → END
"""

from langgraph.graph import END, StateGraph

from app.workflows.states import DocumentWorkflowState
from app.workflows.nodes.document.validate import ValidateDocumentNode
from app.workflows.nodes.document.embed import GenerateEmbeddingNode
from app.workflows.nodes.document.store import StoreVectorsNode


def _route_after_validation(state: DocumentWorkflowState) -> str:
    """Conditional edge: route to embedding if valid, otherwise terminate."""
    return "generate_embeddings" if state.get("is_valid") else END


def build_document_processing_workflow(
    validate_node: ValidateDocumentNode,
    embed_node: GenerateEmbeddingNode,
    store_node: StoreVectorsNode,
):
    """
    Assembles and compiles the Document Processing StateGraph.
    Returns a CompiledGraph ready for `await graph.ainvoke(state)`.
    """
    graph = StateGraph(DocumentWorkflowState)

    # Register nodes — node name must match the function registered below
    graph.add_node(ValidateDocumentNode.node_name, validate_node)
    graph.add_node(GenerateEmbeddingNode.node_name, embed_node)
    graph.add_node(StoreVectorsNode.node_name, store_node)

    # Entry point
    graph.set_entry_point(ValidateDocumentNode.node_name)

    # Conditional routing after validation
    graph.add_conditional_edges(
        ValidateDocumentNode.node_name,
        _route_after_validation,
        {
            GenerateEmbeddingNode.node_name: GenerateEmbeddingNode.node_name,
            END: END,
        },
    )

    # Linear edges
    graph.add_edge(GenerateEmbeddingNode.node_name, StoreVectorsNode.node_name)
    graph.add_edge(StoreVectorsNode.node_name, END)

    return graph.compile()
