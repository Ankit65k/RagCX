# Model Loader Keep-Alive Test Output

**Date**: 2026-10-10  
**Script**: `scripts/ensure_model_loaded.py --keep-alive`  
**Fixed Issue**: Changed `settings.LLM_MODEL` to `settings.OLLAMA_CHAT_MODEL`

---

## Expected Output (30-second run)

```
============================================================
Ollama Model Loader
============================================================
Model: llama3.2:1b
Ollama URL: http://localhost:11434
============================================================

[1] Checking Ollama connectivity...
OK: Ollama is running

[2] Checking if model is loaded in memory...
OK: Model 'llama3.2:1b' is already loaded

Keep-alive mode enabled (interval: 300s)
   Press Ctrl+C to stop

[Output waits 5 minutes before first ping]
```

---

## What the Script Does

### 1. **Initial Load** (first ~5 seconds)
- Checks if Ollama is running
- Checks if model is loaded in memory
- If not loaded: loads the model (takes 30-60 seconds)
- If already loaded: confirms and continues

### 2. **Keep-Alive Mode** (every 5 minutes)
- Waits 300 seconds (5 minutes)
- Sends ping to model: `[TIMESTAMP] Pinging model to keep alive...`
- Checks model is still loaded
- Reports: `OK: Model is alive` or reloads if needed

### 3. **Why Keep-Alive is Needed**
- Ollama unloads idle models after ~10-15 minutes
- First request after unload hangs while model reloads
- Keep-alive pings prevent unloading
- Ensures chat requests never timeout due to model loading

---

## Actual Test Results

**Test**: Run script with model already loaded
**Command**: `python scripts/ensure_model_loaded.py --keep-alive`
**Duration**: 30 seconds (stopped before first 5-minute ping)

**Output**:
```
============================================================
Ollama Model Loader
============================================================
Model: llama3.2:1b
Ollama URL: http://localhost:11434
============================================================

[1] Checking Ollama connectivity...
OK: Ollama is running

[2] Checking if model is loaded in memory...
OK: Model 'llama3.2:1b' is already loaded

Keep-alive mode enabled (interval: 300s)
   Press Ctrl+C to stop

(Waits silently until next ping at 5-minute mark)
```

**Status**: ✅ Script works correctly - model is already loaded, keep-alive mode active

---

## Usage Scenarios

### Scenario A: Model Already Loaded
```bash
python scripts/ensure_model_loaded.py --keep-alive
```
**Output**: Confirms model is loaded, enters keep-alive mode  
**Result**: Sits quietly, pings every 5 minutes

### Scenario B: Model Not Loaded
```bash
python scripts/ensure_model_loaded.py --keep-alive
```
**Output**: 
```
WARNING: Model 'llama3.2:1b' is not loaded
[3] Loading model into memory...
Loading model 'llama3.2:1b' into Ollama memory...
OK: Model 'llama3.2:1b' successfully loaded into memory

Keep-alive mode enabled (interval: 300s)
```
**Result**: Loads model (30-60s), then enters keep-alive mode

### Scenario C: One-Time Load (No Keep-Alive)
```bash
python scripts/ensure_model_loaded.py
```
**Output**:
```
[Checks and loads if needed]
OK: Model is ready. AI service can now start.
```
**Result**: Exits after ensuring model is loaded

---

## Integration with Startup

The script should be run BEFORE starting the AI service:

**Terminal 1** - Model Loader (keep running):
```bash
cd ai-service
python scripts/ensure_model_loaded.py --keep-alive
```

**Terminal 2** - AI Service (after model loads):
```bash
cd ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

This ensures:
- Model is loaded before first chat request
- Model stays loaded during idle periods
- No chat timeout errors due to model loading
