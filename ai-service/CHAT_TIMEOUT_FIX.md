# Chat Timeout Fix

**Date**: 2026-10-10  
**Error**: "failed to transport prompt systembroker timeout error"

---

## Problem

Chat requests are timing out with a "systembroker timeout" error. This happens when:

1. **Ollama model not loaded** - After Ollama restart, models don't auto-load into memory
2. **Timeout too long** - 120 seconds is too long for users to wait
3. **No early detection** - System doesn't check if model is loaded before trying chat

---

## Fixes Applied

### 1. Reduced Timeout (30 seconds)

**Files Changed**:
- `ai-service/app/models/ollama.py` - Line 34: Changed default timeout from 120s to 30s
- `ai-service/app/core/config/ollama_config.py` - Line 15: Changed `OLLAMA_REQUEST_TIMEOUT` from 120.0 to 30.0

**Why**: 
- Users shouldn't wait 2 minutes for a timeout
- 30 seconds is reasonable for model inference
- Faster feedback loop

### 2. Improved Error Message

**File**: `ai-service/app/models/ollama.py`

**Before**:
```python
raise Exception(f"Ollama request timed out after {timeout} seconds: {str(e)}")
```

**After**:
```python
raise Exception(f"Failed to get response from Ollama - request timed out after {timeout} seconds. Check if model is loaded.")
```

**Why**: Tells user to check if model is loaded, not just "timeout"

---

## Root Cause: Model Not Loaded

The main issue is likely that the Ollama model isn't loaded in memory.

### How to Check

Run the diagnostic script:
```bash
cd ai-service
python check_ollama.py
```

Or manually check:
```bash
# Check if model is loaded
curl http://localhost:11434/api/ps

# If response is {"models":[]}, model is NOT loaded
```

### How to Fix

**Option 1: Manual Load (One-time)**
```bash
curl -X POST http://localhost:11434/api/pull -H "Content-Type: application/json" -d '{"name": "llama3.2:1b"}'
```

**Option 2: Use Keep-Alive Script (Recommended)**
```bash
cd ai-service
python scripts/ensure_model_loaded.py --keep-alive
```

This will:
- Load the model immediately
- Ping every 5 minutes to prevent unloading
- Run in background while you use the app

---

## Startup Sequence (CORRECT ORDER)

To avoid timeout errors, start services in this order:

### Terminal 1: Ollama Model Loader
```bash
cd ai-service
python scripts/ensure_model_loaded.py --keep-alive
```
**Wait for**: "Model loaded successfully"

### Terminal 2: AI Service
```bash
cd ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
**Wait for**: "Application startup complete"

### Terminal 3: Backend
```bash
cd backend
npm run dev
```
**Wait for**: "Nest application successfully started"

### Terminal 4: Frontend
```bash
cd frontend
npm run dev
```
**Wait for**: "Ready in Xms"

---

## Testing

### 1. Check Ollama Status
```bash
cd ai-service
python check_ollama.py
```

**Expected Output**:
```
✅ Ollama is running
✅ Model is loaded: ['llama3.2:1b']
✅ Chat test successful
```

### 2. Test Chat Request

**Via Frontend**:
1. Open http://localhost:3000
2. Upload a document (if not already done)
3. Go to chat
4. Ask a question

**Via API** (quick test):
```bash
curl -X POST http://localhost:8000/api/v1/chat/test \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

**Expected**: Response within 30 seconds

---

## Timeout Error Scenarios

### Scenario A: Model Not Loaded
**Symptom**: Request hangs for 30 seconds, then timeout error

**Check**:
```bash
curl http://localhost:11434/api/ps
# Returns: {"models":[]}
```

**Fix**: Load model
```bash
curl -X POST http://localhost:11434/api/pull -H "Content-Type: application/json" -d '{"name": "llama3.2:1b"}'
```

### Scenario B: Ollama Not Running
**Symptom**: Connection refused error

**Check**:
```bash
curl http://localhost:11434/api/tags
# Connection refused
```

**Fix**: Start Ollama
```bash
ollama serve
```

### Scenario C: Wrong Model
**Symptom**: Model not found error

**Check**:
```bash
ollama list
# Check if llama3.2:1b is installed
```

**Fix**: Pull correct model
```bash
ollama pull llama3.2:1b
```

### Scenario D: Context Too Large
**Symptom**: Timeout with model loaded

**Cause**: Too many documents in context, model processing too long

**Fix**: 
- Reduce `OLLAMA_CONTEXT_WINDOW` in `.env`
- Select fewer documents
- Ask shorter questions

---

## Prevention

### 1. Always Use Keep-Alive Script
```bash
python scripts/ensure_model_loaded.py --keep-alive
```

This prevents:
- Model unloading after 10-15 minutes idle
- First-request timeouts
- Manual model loading

### 2. Monitor Ollama Status
Add to your workflow:
```bash
# Quick check
curl http://localhost:11434/api/ps

# Or use diagnostic
python check_ollama.py
```

### 3. Check Logs
Watch AI service logs for:
```
WARNING: No chunks retrieved!
ERROR: Failed to get response from Ollama - request timed out
```

---

## Files Modified

1. `ai-service/app/models/ollama.py`
   - Reduced default timeout: 120s → 30s
   - Better timeout error message

2. `ai-service/app/core/config/ollama_config.py`
   - Updated `OLLAMA_REQUEST_TIMEOUT`: 120.0 → 30.0

3. `ai-service/check_ollama.py` (NEW)
   - Diagnostic script to check Ollama status
   - Test chat endpoint
   - Load model if needed

---

## Summary

**Before**: 120s timeout, generic error message, no diagnostics  
**After**: 30s timeout, helpful error message, diagnostic tools

**Key Fix**: Always ensure model is loaded BEFORE starting chat

**Quick Start**:
```bash
# 1. Load model
python scripts/ensure_model_loaded.py --keep-alive

# 2. Start AI service
python -m uvicorn app.main:app --reload

# 3. Test
python check_ollama.py
```
