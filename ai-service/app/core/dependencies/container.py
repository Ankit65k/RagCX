import logging
import httpx
import redis.asyncio as redis
from dependency_injector import containers, providers

from app.core.config.settings import settings
from app.models.ollama import OllamaProvider
from app.embeddings.ollama import OllamaEmbeddingProvider
from app.redis.dispatcher import HandlerRegistry
from app.redis.worker import RedisWorker
from app.processors.components import (
    PDFValidator,
    PDFLoader,
    MetadataExtractor,
    TextCleaner,
    PageExtractor,
    ChunkGenerator,
)
from app.processors.document_processor import DocumentProcessor
from app.embeddings.factory import EmbeddingFactory
from app.embeddings.service import EmbeddingService
import chromadb
from app.vector_store.factory import VectorStoreFactory
from app.retrievers.services import QueryEmbeddingService
from app.retrievers.factory import RetrieverFactory
from app.workflows.factory import WorkflowFactory
from app.rag.components.query_validator import QueryValidator
from app.rag.components.query_normalizer import QueryNormalizer
from app.rag.components.context_ranker import ContextRanker
from app.rag.components.prompt_builder import PromptBuilder
from app.rag.components.answer_validator import AnswerValidator
from app.rag.components.citation_builder import CitationBuilder
from app.rag.components.response_formatter import ResponseFormatter
from app.rag.pipeline import RAGPipeline
from app.questions.components.chunk_selector import RepresentativeChunkSelector
from app.questions.components.prompt_builder import QuestionPromptBuilder
from app.questions.components.validator import QuestionValidator
from app.questions.components.deduplicator import QuestionDeduplicator
from app.questions.components.ranker import QuestionRanker
from app.questions.components.formatter import QuestionFormatter
from app.questions.pipeline import QuestionGenerationPipeline
from app.memory.store import InMemoryConversationStore
from app.memory.factory import MemoryFactory
from app.chat.conversation import ConversationManager
from app.chat.context import ChatContextBuilder
from app.chat.builder import ResponseBuilder
from app.chat.publisher import ResponsePublisher
from app.chat.pipeline import ChatPipeline
from app.chat.handler import ChatEventHandler

# Placeholder stubs for vector store and graph builder to keep DI extensible
class VectorStoreClientStub:
    def __init__(self, persist_dir: str, collection_name: str) -> None:
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self.status = "placeholder"


class GraphBuilderStub:
    def __init__(self, recursion_limit: int) -> None:
        self.recursion_limit = recursion_limit
        self.status = "placeholder"


class Container(containers.DeclarativeContainer):
    """
    Core Dependency Injection Container for the AI Service.
    """

    wiring_config = containers.WiringConfiguration(
        modules=[
            "app.api.v1.endpoints.health",
            "app.api.v1.endpoints.version",
        ]
    )

    # 1. Configuration Provider
    config = providers.Object(settings)

    # 2. Logger Provider
    logger = providers.Singleton(
        logging.getLogger,
        name="app",
    )

    # 3. Redis Async Connection Provider
    redis_client = providers.Singleton(
        redis.from_url,
        url=settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )

    # 4. HTTP Connection Provider for Ollama API
    # connect=10s catches unreachable host quickly; read=300s allows LLM inference.
    http_client = providers.Singleton(
        httpx.AsyncClient,
        timeout=httpx.Timeout(connect=10.0, read=settings.OLLAMA_REQUEST_TIMEOUT, write=30.0, pool=10.0),
    )

    # 5. LLM Provider Provider
    llm_provider = providers.Singleton(
        OllamaProvider,
        client=http_client,
    )

    # 6. Embedding Provider Provider
    embedding_provider = providers.Singleton(
        EmbeddingFactory.get_provider
    )

    # Chroma Persistent Client connection singleton
    chroma_client = providers.Singleton(
        chromadb.PersistentClient,
        path=settings.CHROMA_PERSIST_DIR,
    )

    # 7. Vector Store Provider (Resolved dynamically via Factory)
    vector_store = providers.Singleton(
        VectorStoreFactory.get_vector_store,
        client=chroma_client,
    )

    # 8. Future Graph Builder Provider (LangGraph Stub Provider)
    graph_builder = providers.Singleton(
        GraphBuilderStub,
        recursion_limit=settings.LANGGRAPH_RECURSION_LIMIT,
    )

    # 11. PDF Processor Components & Orchestrator
    pdf_validator = providers.Singleton(PDFValidator)
    pdf_loader = providers.Singleton(PDFLoader)
    metadata_extractor = providers.Singleton(MetadataExtractor)
    text_cleaner = providers.Singleton(TextCleaner)
    page_extractor = providers.Singleton(
        PageExtractor,
        cleaner=text_cleaner,
    )
    chunk_generator = providers.Singleton(
        ChunkGenerator,
        chunk_size=settings.EMBEDDING_CHUNK_SIZE,
        chunk_overlap=settings.EMBEDDING_CHUNK_OVERLAP,
    )

    document_processor = providers.Singleton(
        DocumentProcessor,
        validator=pdf_validator,
        loader=pdf_loader,
        metadata_extractor=metadata_extractor,
        page_extractor=page_extractor,
        chunk_generator=chunk_generator,
    )

    # 12. Embedding Service Provider
    embedding_service = providers.Singleton(
        EmbeddingService,
        provider=embedding_provider,
    )

    # 13. Query Embedding Service
    query_embedding_service = providers.Singleton(
        QueryEmbeddingService,
        provider=embedding_provider,
    )

    # 14. Retriever Provider (Resolved dynamically via Factory)
    retriever = providers.Singleton(
        RetrieverFactory.get_retriever,
        embedding_service=query_embedding_service,
        vector_store=vector_store,
    )

    # 15. Conversation Memory Storage & Manager
    conversation_store = providers.Singleton(InMemoryConversationStore)

    memory_manager = providers.Singleton(
        MemoryFactory.create_memory_manager,
        store=conversation_store,
        llm_provider=llm_provider,
        max_messages=20,
        max_tokens=4000,
        max_characters=16000,
    )

    # 16. Suggested Questions Generation Pipeline Components
    question_chunk_selector = providers.Singleton(RepresentativeChunkSelector, min_chunk_length=150, max_chunks=6)
    question_prompt_builder = providers.Singleton(QuestionPromptBuilder)
    question_validator = providers.Singleton(QuestionValidator)
    question_deduplicator = providers.Singleton(QuestionDeduplicator, embedding_service=embedding_service)
    question_ranker = providers.Singleton(QuestionRanker)
    question_formatter = providers.Singleton(QuestionFormatter)

    # 17. Suggested Questions Generation Pipeline
    question_generation_pipeline = providers.Singleton(
        QuestionGenerationPipeline,
        llm_provider=llm_provider,
        chunk_selector=question_chunk_selector,
        prompt_builder=question_prompt_builder,
        validator=question_validator,
        deduplicator=question_deduplicator,
        ranker=question_ranker,
        formatter=question_formatter,
    )

    # 18. Workflow Engine (top-level orchestration facade)
    workflow_engine = providers.Singleton(
        WorkflowFactory.create_engine,
        embedding_service=embedding_service,
        vector_store=vector_store,
        retriever=retriever,
        llm_provider=llm_provider,
        question_generation_pipeline=question_generation_pipeline,
        memory_manager=memory_manager,
    )

    # 19. RAG Pipeline Components
    rag_query_validator = providers.Singleton(QueryValidator)
    rag_query_normalizer = providers.Singleton(QueryNormalizer)
    rag_context_ranker = providers.Singleton(
        ContextRanker,
        max_context_chunks=5,
        max_context_chars=4000,
    )
    rag_prompt_builder = providers.Singleton(PromptBuilder)
    rag_answer_validator = providers.Singleton(AnswerValidator)
    rag_citation_builder = providers.Singleton(CitationBuilder)
    rag_response_formatter = providers.Singleton(ResponseFormatter)

    # 20. RAG Pipeline Orchestrator
    rag_pipeline = providers.Singleton(
        RAGPipeline,
        retriever=retriever,
        llm_provider=llm_provider,
        query_validator=rag_query_validator,
        query_normalizer=rag_query_normalizer,
        context_ranker=rag_context_ranker,
        prompt_builder=rag_prompt_builder,
        answer_validator=rag_answer_validator,
        citation_builder=rag_citation_builder,
        response_formatter=rag_response_formatter,
    )

    # 21. Chat Event Pipeline Components
    chat_conversation_manager = providers.Singleton(
        ConversationManager,
        memory_manager=memory_manager,
    )
    chat_context_builder = providers.Singleton(ChatContextBuilder)
    chat_response_builder = providers.Singleton(ResponseBuilder)
    chat_response_publisher = providers.Singleton(
        ResponsePublisher,
        redis_client=redis_client,
    )

    chat_pipeline = providers.Singleton(
        ChatPipeline,
        conversation_manager=chat_conversation_manager,
        context_builder=chat_context_builder,
        workflow_engine=workflow_engine,
        response_builder=chat_response_builder,
        response_publisher=chat_response_publisher,
    )

    chat_event_handler = providers.Singleton(
        ChatEventHandler,
        pipeline=chat_pipeline,
    )

    # 22. Event Dispatcher Provider (Bootstrapped Registry)
    event_dispatcher = providers.Singleton(
        HandlerRegistry.bootstrap,
        redis_client=redis_client,
        chat_event_handler=chat_event_handler,
        vector_store=vector_store,
        question_generation_pipeline=question_generation_pipeline,
        document_processor=document_processor,
        embedding_service=embedding_service,
    )

    # 23. Redis Worker Provider
    redis_worker = providers.Singleton(
        RedisWorker,
        redis_client=redis_client,
        dispatcher=event_dispatcher,
    )
