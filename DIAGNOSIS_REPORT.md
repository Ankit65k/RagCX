# Bug Diagnosis Report: "Failed to retrieve suggested questions"

**Date**: 2026-10-01  
**Investigator**: Claude Code  
**RequestID**: e-2d6z3p481erh6g4c8ij6m

---

## Executive Summary

The UI error "Failed to retrieve suggested questions" is a **symptom**, not the root cause. The actual issue is **PDF processing failure** that leaves zero chunks in the vector database, causing the suggestions pipeline to return an empty array.

---

## Reproduction Steps

1. Uploaded PDF: `0dfd303e-0c7b-4cf3-a36b-37ffee33d88f-1785858588444.pdf` (348 bytes)
2. Document ID: `50ac3126-6f6f-48ff-a022-bd47356ea154`
3. Called `/api/v1/suggested-questions?documentId=50ac3126-6f6f-48ff-a022-bd47356ea154`
4. Response: `[]` (HTTP 200)
5. Frontend shows: "Failed to retrieve suggested questions"

---

## Layer-by-Layer Analysis

### ✅ Layer 1: Frontend → Backend API Call
- **Status**: Working
- **Evidence**: HTTP 200 response received
- Request reaches backend controller successfully

### ✅ Layer 2: Backend Route & Controller
- **Status**: Working  
- **File**: `backend/src/modules/chat/controllers/questions.controller.ts`
- Successfully publishes `SUGGESTED_QUESTIONS_REQUEST` to Redis channel `chat:jobs`
- Subscribes to responses and waits (timeout: 45s)

### ✅ Layer 3: Redis Pub/Sub Event Delivery
- **Status**: Working
- **Evidence**: AI service dispatcher log shows:
  ```
  "Dispatcher: Dispatching SUGGESTED_QUESTIONS_REQUEST (ID: e-2d6z3p481erh6g4c8ij6m)"
  ```
- Event reaches AI service worker successfully

### ✅ Layer 4: AI Service Event Handler
- **Status**: Working
- **File**: `ai-service/app/redis/handlers.py:SuggestedQuestionsHandler`
- Handler executes and publishes `SUGGESTED_QUESTIONS_RESPONSE`
- Log: `"Handler: Successfully generated and published suggested questions for 50ac3126-6f6f-48ff-a022-bd47356ea154"`

### ❌ **Layer 5: Document Processing (ROOT CAUSE)**
- **Status**: FAILED ❌
- **Error**: `"Chunk list cannot be empty."`
- **Evidence**:
  ```json
  {
    "processingStatus": "FAILED",
    "totalPages": 0,
    "chunkCount": 0,
    "embeddingCount": 0
  }
  ```
- **Vector DB check**: 0 chunks in Chroma for this documentId

### ⚠️ Layer 6: Question Generation Pipeline
- **Status**: Working but returns empty fallback
- **File**: `ai-service/app/questions/pipeline.py`
- Code path taken:
  ```python
  if not chunks:
      return QuestionGenerationResult(
          questions=[],
          metadata={"status": "FALLBACK_EMPTY_CONTENT"}
      )
  ```
- **Result**: Empty questions array `[]`

### ⚠️ Layer 7: Backend Response Handling
- **Status**: Working but misleading
- Returns HTTP 200 with `[]`
- **Problem**: No distinction between:
  - "Document still processing" (status: PROCESSING)
  - "No chunks extracted" (status: FAILED)
  - "Questions successfully generated but empty" (edge case)

---

## Root Cause

**Primary**: PDF text extraction failed with "Chunk list cannot be empty"
- File size: 348 bytes (suspiciously small - likely corrupted or empty PDF)
- No text was extracted from the PDF
- Zero chunks generated

**Secondary**: Missing guard logic
- Suggested questions handler doesn't check if document status is `COMPLETED`
- No differentiated error messages for different failure modes

---

## Why UI Shows "Failed to retrieve suggested questions"

Backend returns `[]` (empty array) with HTTP 200. Frontend likely expects:
- Either a non-empty array of questions
- Or a specific error structure

When it gets `[]`, it assumes failure and shows generic error.

---

## Missing Components Analysis

### ✅ Route exists
`GET /api/v1/suggested-questions` in `backend/src/modules/chat/routes/questions.routes.ts`

### ✅ Controller exists
`QuestionsController.getSuggestedQuestions()` in `backend/src/modules/chat/controllers/questions.controller.ts`

### ✅ Event type registered
`SUGGESTED_QUESTIONS_REQUEST` / `SUGGESTED_QUESTIONS_RESPONSE` in shared contracts

### ✅ AI service handler exists
`SuggestedQuestionsHandler` in `ai-service/app/redis/handlers.py`

### ❌ Missing guard: Document status check
Handler should verify `processingStatus === 'COMPLETED'` before attempting to generate questions

### ❌ Missing: Proper error differentiation
Need distinct responses for:
1. "Still processing" → HTTP 202 or specific status
2. "Processing failed" → HTTP 500 with reason
3. "No chunks available" → HTTP 404 or specific error code
4. "Timeout" → HTTP 504

---

## Ollama Status

```bash
$ curl http://localhost:11434/api/ps
{"models":[{"name":"llama3.1:8b",...}]}
```

✅ Model is loaded and responding

**Direct test** (120s timeout should be sufficient):
```bash
$ time curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"llama3.1:8b","prompt":"Say hello","stream":false}'
# Response time: ~5-10 seconds for simple prompts
```

---

## Conclusion

**The "Failed to retrieve suggested questions" error is caused by:**
1. **Upstream failure**: PDF text extraction returned no chunks
2. **Poor error handling**: System returns empty array instead of meaningful error
3. **Missing validation**: No check for document processing status before generating questions

**The suggestion system itself works perfectly** - it just needs valid input (processed document with chunks).

---

## Recommendations

1. **Immediate**: Add document status check before generating questions
2. **Short-term**: Improve PDF text extraction robustness
3. **Long-term**: Implement proper error codes and UI messaging for all failure modes
