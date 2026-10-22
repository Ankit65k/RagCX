# Suggested Questions Optimization - Changes Summary

## Date: 2026-10-01

## Problem Identified
- llama3.1:8b (5.6GB) was timing out after 120+ seconds on 8GB RAM CPU-only system
- Ollama chat API completely unresponsive with large models
- Silent fallback to generic questions hiding the real issue

## Solution Implemented: Switch to llama3.2:1b

### ✅ Step 1: Model Performance Test
**Result**: llama3.2:1b works perfectly
- Response time: **1.1 seconds** (vs 120+ second timeout)
- Model size: 1.3GB (vs 5.6GB for llama3.1:8b)
- Test output: Successfully generated "Hi. How can I help you today?"

### ✅ Step 2: Environment Variables
**File**: `ai-service/.env`
```env
OLLAMA_CHAT_MODEL="llama3.2:1b"
OLLAMA_EMBED_MODEL="nomic-embed-text"
```
- Separated chat and embedding models
- Removed hardcoded `LLM_MODEL`

### ✅ Step 3: CPU-Friendly Optimizations

#### Settings Updated:
**Files**: `app/core/config/settings.py`, `app/core/config/ollama_config.py`
- `OLLAMA_TEMPERATURE`: 0.7 → **0.3** (more focused output)
- `OLLAMA_CONTEXT_WINDOW`: 4096 → **2048** (reduced memory)
- `OLLAMA_REQUEST_TIMEOUT`: 300s → **120s**
- `OLLAMA_KEEP_ALIVE`: 5m → **30m** (keeps model loaded longer)

#### Code Changes:
**File**: `app/models/ollama.py`
- Added `options` to chat payload:
  - `temperature: 0.3`
  - `num_ctx: 2048`
  - `num_predict: 200` (limits output length)
- Changed `self.model` to use `settings.OLLAMA_CHAT_MODEL`

**File**: `app/embeddings/ollama.py`
- Changed to use `settings.OLLAMA_EMBED_MODEL`

**File**: `app/questions/components/chunk_selector.py`
- Reduced `max_chunks`: 6 → **3** (less context for CPU)

### ✅ Step 4: Timeout Fixed
- Generation timeout: 60s → **120s**
- Backend already waits longer than AI service (no changes needed)

### ✅ Step 5: Removed Silent Fallback
**File**: `app/questions/pipeline.py`

**Before**: Silently returned generic questions on timeout
```python
except Exception as e:
    raw_response = self._generate_fallback_questions(count)
```

**After**: Returns clear error with details
```python
except Exception as e:
    return QuestionGenerationResult(
        questions=[],
        metadata={
            "status": "LLM_GENERATION_FAILED",
            "message": f"LLM generation failed after 120s: {str(e)}",
            "error": str(e),
        },
    )
```

**Removed**:
- `_generate_fallback_questions()` method (lines 139-177)
- All silent fallback logic

### ✅ Step 6: Model Warmup at Startup
**File**: `app/main.py`
- Added `warmup_llm_model()` function
- Loads model into memory on service startup
- Prevents first-request cold start delay
- Warmup confirmed in logs: "LLM model warmup successful" (line 10)

## Service Status
✅ **AI Service Running**: http://localhost:8000
- Health check: `{"status":"healthy"}`
- Model warmed up: llama3.2:1b loaded in 3 seconds
- Redis connected
- Ollama connected

## Next Steps (Testing Required)

### Step 7: Cache Verification
Check if caching includes documentId:
```bash
redis-cli KEYS "suggested_questions:*"
```

### Step 8: End-to-End Verification
Test with two different PDFs:
1. Upload PDF #1 → Regenerate questions → Note the questions + generation time
2. Upload PDF #2 → Regenerate questions → Verify different questions + time
3. Expected: Different questions for each PDF in ~2-5 seconds

## Performance Expectations
- **Generation time**: 2-5 seconds (down from 120+ timeout)
- **Model**: llama3.2:1b (1.3GB, CPU-optimized)
- **Context**: 3 chunks max (reduced from 6)
- **Output**: 200 tokens max
- **Keep-alive**: 30 minutes (model stays loaded)

## What Changed vs What Didn't
✅ Changed: Model, timeout, chunk count, CPU optimizations, error handling
❌ Not changed: Embedding model (nomic-embed-text still works), RAG pipeline, Redis events, ChromaDB
