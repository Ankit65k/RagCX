"""
WorkflowFactory — assembles a fully-wired WorkflowEngine from injected dependencies.

This is the only place where workflow definitions, nodes, and the engine
are wired together. Adding a new workflow requires changes here and in
the registry — nothing else.
"""

import logging

from app.workflows.registry import WorkflowRegistry, WorkflowNames
from app.workflows.builder import WorkflowBuilder
from app.workflows.executor import WorkflowExecutor
from app.workflows.engine import WorkflowEngine

# Node imports
from app.workflows.nodes.document.validate import ValidateDocumentNode
from app.workflows.nodes.document.embed import GenerateEmbeddingNode
from app.workflows.nodes.document.store import StoreVectorsNode
from app.workflows.nodes.chat.retrieve import RetrieveContextNode
from app.workflows.nodes.chat.prompt import GeneratePromptNode
from app.workflows.nodes.chat.answer import GenerateAnswerNode
from app.workflows.nodes.questions.questions import GenerateQuestionsNode

# Workflow definition builders
from app.workflows.definitions.document_processing import build_document_processing_workflow
from app.workflows.definitions.chat import build_chat_workflow
from app.workflows.definitions.suggested_questions import build_suggested_questions_workflow

# Dependency types
from app.embeddings.service import EmbeddingService
from app.vector_store.base import VectorStore
from app.retrievers.base import Retriever
from app.models.ollama import OllamaProvider
from app.questions.pipeline import QuestionGenerationPipeline
from app.memory.manager import MemoryManager

logger = logging.getLogger("app")


class WorkflowFactory:
    """
    Builds a production-ready WorkflowEngine with all nodes and workflows registered.
    Called once at application startup via the DI container.
    """

    @staticmethod
    def create_engine(
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
        retriever: Retriever,
        llm_provider: OllamaProvider,
        question_generation_pipeline: QuestionGenerationPipeline,
        memory_manager: MemoryManager,
    ) -> WorkflowEngine:
        logger.info("WorkflowFactory: Assembling workflow engine...")

        # --- Instantiate nodes ---
        validate_node = ValidateDocumentNode()
        embed_node = GenerateEmbeddingNode(embedding_service=embedding_service)
        store_node = StoreVectorsNode(vector_store=vector_store)
        retrieve_node = RetrieveContextNode(retriever=retriever, memory_manager=memory_manager)
        prompt_node = GeneratePromptNode()
        answer_node = GenerateAnswerNode(llm_provider=llm_provider, memory_manager=memory_manager)
        questions_node = GenerateQuestionsNode(pipeline=question_generation_pipeline)

        # --- Build registry ---
        registry = WorkflowRegistry()

        registry.register(
            WorkflowNames.DOCUMENT_PROCESSING,
            lambda **_: build_document_processing_workflow(
                validate_node=validate_node,
                embed_node=embed_node,
                store_node=store_node,
            ),
        )
        registry.register(
            WorkflowNames.CHAT,
            lambda **_: build_chat_workflow(
                retrieve_node=retrieve_node,
                prompt_node=prompt_node,
                answer_node=answer_node,
            ),
        )
        registry.register(
            WorkflowNames.SUGGESTED_QUESTIONS,
            lambda **_: build_suggested_questions_workflow(
                questions_node=questions_node,
            ),
        )

        logger.info(
            f"WorkflowFactory: Registered {len(registry.registered_names)} workflows: "
            f"{registry.registered_names}"
        )

        return WorkflowEngine(
            registry=registry,
            builder=WorkflowBuilder(registry=registry),
            executor=WorkflowExecutor(),
            node_kwargs={},  # Nodes are pre-bound via closures above
        )
