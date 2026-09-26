# Graph Directory

**Note**: This directory is not used in the current implementation.

The LangGraph workflow implementation is located in:
- **`app/workflows/`** - Main workflow orchestration system
- **`app/workflows/definitions/chat.py`** - Chat workflow graph definition
- **`app/workflows/nodes/chat/`** - Chat workflow nodes (retrieve, prompt, answer)
- **`app/workflows/states.py`** - Workflow state schemas (TypedDicts)

## Chat Workflow Architecture

The chat workflow follows this graph:
```
retrieve_context → generate_prompt → generate_answer → END
```

### Nodes:
1. **RetrieveContextNode** - Retrieves relevant document chunks and conversation history
2. **GeneratePromptNode** - Assembles the LLM prompt with context
3. **GenerateAnswerNode** - Calls Ollama LLM to generate structured JSON response

### State Schema (ChatWorkflowState):
- Input: `query`, `conversation_id`, `document_id`, `top_k`, `score_threshold`
- Output: `retriever_result`, `prompt`, `answer`, `citations`, `confidence`, `reasoning`

## Integration

The workflow is wired via:
- **WorkflowFactory** (`app/workflows/factory.py`) - Instantiates nodes and registers workflows
- **WorkflowEngine** (`app/workflows/engine.py`) - Execution facade
- **ChatPipeline** (`app/chat/pipeline.py`) - Calls the engine with initial state

All workflows are registered at application startup in the DI container (`app/core/dependencies/container.py`).
