# Testing Checklist - Document Processing & Chat Flow

**Date**: 2026-09-26  
**Prerequisites**: All services running, nomic-embed-text model pulled

---

## ✅ Pre-Flight Checks

### 1. Verify Services Are Running
```bash
# Check backend
curl http://localhost:4000/api/v1/health

# Check AI service  
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000
```

### 2. Verify Ollama Has Required Model
```bash
ollama list | grep nomic-embed-text
```
**Expected**: Should show `nomic-embed-text` model

If missing, run:
```bash
ollama pull nomic-embed-text
```

---

## 🔍 Investigation: Document fc34876b-4107-4545-952c-4aa2aa239f63

### Step 1: Check if Document Exists in Database
Using a database client (PgAdmin, DBeaver, or psql):
```sql
SELECT 
    id, 
    filename, 
    "mimeType", 
    "processingStatus",
    "uploadStatus",
    "uploadedBy",
    "createdAt",
    "updatedAt"
FROM "Document" 
WHERE id = 'fc34876b-4107-4545-952c-4aa2aa239f63';
```

**Expected Outcomes**:
- ✅ **If found**: Document exists but was never processed
- ❌ **If not found**: Upload never reached the backend

### Step 2: Check Backend Logs for DOCUMENT_UPLOADED Event
Search backend logs for this document ID:
```bash
# Windows PowerShell
Get-Content C:\Users\Ankit Tiwari\RagCX\backend.log | Select-String "fc34876b"
```

**Expected Outcomes**:
- ✅ **Found with DOCUMENT_UPLOADED**: Backend published the event
- ❌ **Not found**: Backend never received/logged the upload

### Step 3: Check AI Service Logs
```bash
Get-Content "C:\Users\Ankit Tiwari\RagCX\ai-service.log" | Select-String "fc34876b"
```

**Expected Outcomes**:
- ✅ **Found with "Handler: Processing document"**: AI service received the event
- ❌ **Not found**: AI service never received the DOCUMENT_UPLOADED event

### Step 4: Check Redis for Queued Events
```bash
# Connect to Redis CLI (if you have redis-cli or Memurai CLI)
redis-cli

# Check if there are pending messages in document:jobs channel
SUBSCRIBE document:jobs

# Or check dead letter queue
LRANGE document:failed:dlq 0 -1
```

---

## 🧪 Test Case 1: Fresh Document Upload

### Step 1: Upload a New Test Document
1. Go to http://localhost:3000/documents/upload
2. Upload a small PDF (e.g., a 1-page test document)
3. Note the document ID returned in the response

### Step 2: Monitor Processing Status
```bash
# Check document status via API (replace <DOC_ID> with actual ID)
curl http://localhost:4000/api/v1/documents/<DOC_ID> \
  -H "Cookie: access_token=<YOUR_TOKEN>"
```

**Watch for status progression**:
- `PENDING` → `PROCESSING` → `COMPLETED` (SUCCESS ✅)
- `PENDING` → `FAILED` (ERROR ❌)
- Stuck at `PENDING` for >30 seconds (BUG ❌)

### Step 3: Check Backend Logs in Real-Time
```bash
Get-Content C:\Users\Ankit Tiwari\RagCX\backend.log -Wait -Tail 50
```

**Look for**:
- `"msg":"DocumentService: upload completed"`
- `"eventType":"DOCUMENT_UPLOADED"` published to Redis
- `"eventType":"DOCUMENT_PROCESSING_STARTED"` received back
- `"eventType":"DOCUMENT_PROCESSING_COMPLETED"` received (SUCCESS)

### Step 4: Check AI Service Logs
```bash
Get-Content "C:\Users\Ankit Tiwari\RagCX\ai-service.log" -Wait -Tail 50
```

**Look for**:
- `"Dispatcher: Dispatching DOCUMENT_UPLOADED"`
- `"Handler: Processing document uploaded event"`
- `"Pipeline: Starting PDF processing"`
- `"Pipeline: Processing completed"`
- `"Embedding: Starting generation"`
- `"ChromaDB: Successfully stored"`
- **NO** `"model \"nomic-embed-text\" not found"` errors

### Step 5: Verify Document Reached COMPLETED
```bash
curl http://localhost:4000/api/v1/documents/<DOC_ID> \
  -H "Cookie: access_token=<YOUR_TOKEN>" | jq .processingStatus
```

**Expected**: `"COMPLETED"`

---

## 🧪 Test Case 2: Reprocess Document (Permission Fix Verification)

**This tests the requirePermission() fix we made today**

### Step 1: Try to Reprocess as Regular USER (not ADMIN)
```bash
curl -X POST http://localhost:4000/api/v1/documents/<DOC_ID>/reprocess \
  -H "Cookie: access_token=<USER_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected**: 
- ✅ `200 OK` or `202 Accepted` (SUCCESS - fix worked!)
- ❌ `403 Forbidden` (FAILURE - fix didn't work)

### Step 2: Verify Reprocess Event Published
Check backend logs for:
```
"eventType":"DOCUMENT_REPROCESS_REQUESTED"
```

---

## 🧪 Test Case 3: Chat Query with Document Context

### Step 1: Create a New Chat Session
```bash
curl -X POST http://localhost:4000/api/v1/chat/sessions \
  -H "Cookie: access_token=<YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat",
    "userId": "<YOUR_USER_ID>"
  }'
```

Note the `sessionId` returned.

### Step 2: Send a Chat Message About Your Document
```bash
curl -X POST http://localhost:4000/api/v1/chat/sessions/<SESSION_ID>/messages \
  -H "Cookie: access_token=<YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What does this document say?",
    "sessionId": "<SESSION_ID>"
  }'
```

### Step 3: Verify Response Has Citations
**Check the response for**:
- ✅ `answer` field with actual content (not empty)
- ✅ `sources` array with document references
- ✅ `confidence` score
- ✅ Each source has `documentId`, `chunkId`, `content`, `pageNumber`

**Example of GOOD response**:
```json
{
  "answer": "The document discusses...",
  "sources": [
    {
      "documentId": "abc-123",
      "chunkId": "chunk-1",
      "content": "Relevant excerpt...",
      "pageNumber": 1,
      "similarity": 0.89
    }
  ],
  "confidence": 0.85
}
```

### Step 4: Check AI Service Chat Logs
Look for:
```
"Dispatcher: Dispatching CHAT_REQUEST"
"Workflow: Starting chat workflow"
"RetrieveContext: Found X relevant chunks"
"GenerateAnswer: LLM response generated"
```

---

## 🧪 Test Case 4: Delete Document (Permission Fix Verification)

**This tests the second requirePermission() fix we made today**

### Step 1: Try to Delete as Regular USER
```bash
curl -X DELETE http://localhost:4000/api/v1/documents/<DOC_ID> \
  -H "Cookie: access_token=<USER_TOKEN>"
```

**Expected**: 
- ✅ `200 OK` or `204 No Content` (SUCCESS - fix worked!)
- ❌ `403 Forbidden` (FAILURE - fix didn't work)

### Step 2: Verify Document is Soft-Deleted
```sql
SELECT id, filename, "uploadStatus", "deletedAt" 
FROM "Document" 
WHERE id = '<DOC_ID>';
```

**Expected**: `deletedAt` should have a timestamp

---

## 📊 Success Criteria Summary

| Test | Criteria | Status |
|------|----------|--------|
| **Ollama Model** | nomic-embed-text installed | ⬜ |
| **Fresh Upload** | Document reaches COMPLETED | ⬜ |
| **Embedding Generation** | No "model not found" errors | ⬜ |
| **USER Reprocess** | 200 OK (not 403 Forbidden) | ⬜ |
| **USER Delete** | 200 OK (not 403 Forbidden) | ⬜ |
| **Chat Query** | Returns answer with citations | ⬜ |
| **ChromaDB Storage** | Chunks stored successfully | ⬜ |

---

## 🐛 Common Issues & Solutions

### Issue: Document Stuck at PENDING
**Diagnosis**:
1. Check if backend published DOCUMENT_UPLOADED event
2. Check if AI service subscribed to document:jobs channel
3. Check Redis connectivity between services

**Solution**:
- Restart AI service
- Check Redis is running: `redis-cli ping`
- Manually reprocess: `POST /api/v1/documents/<ID>/reprocess`

### Issue: Embedding Fails with "model not found"
**Diagnosis**: Ollama doesn't have nomic-embed-text

**Solution**:
```bash
ollama pull nomic-embed-text
ollama list  # verify it's there
```

### Issue: Chat Returns Empty Answer
**Diagnosis**:
1. Check if document actually reached COMPLETED
2. Check if chunks were stored in ChromaDB
3. Check if retrieval is finding relevant chunks

**Solution**:
- Verify document processingStatus = COMPLETED
- Check ai-service logs for "RetrieveContext: Found 0 chunks" (bad)
- Try reprocessing the document

### Issue: 403 Forbidden on Delete/Reprocess
**Diagnosis**: Permission fix not applied or backend not restarted

**Solution**:
- Verify `backend/src/modules/documents/routes/document.routes.ts` has `requirePermission()` not `requireRole('ADMIN')`
- Restart backend service
- Clear browser cookies and re-login

---

## 📝 Notes for Debugging

**If upload fails silently (no logs at all)**:
- Backend service crashed or not running
- Frontend pointing to wrong API URL
- CORS issues blocking the request

**If AI service doesn't receive events**:
- Redis connection issue
- Channel name mismatch (document:jobs)
- AI service worker thread crashed

**If embeddings fail intermittently**:
- Ollama service overloaded
- Network timeout talking to Ollama
- Check Ollama logs: `ollama logs` (if available)
