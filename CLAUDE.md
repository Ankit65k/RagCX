\## Development Guidelines



Before making any change, always:

1\. Read the actual file(s) involved — never assume a function, import, variable, or API exists. If unsure, search/grep for it or check the docs/package before using it.

2\. If uncertain about a fact (a library's API, a config option, version-specific behavior), say so and verify it rather than guessing.

3\. After any change, verify it — read the modified file back, run relevant tests, or run the app/build before saying the task is done.



For code style:

\- Match existing naming, folder structure, and patterns already used in this repo instead of introducing a generic style.

\- Prefer clear, readable code over clever one-liners. Use meaningful variable/function names.

\- Avoid unnecessary abstraction, premature optimization, or over-engineering.

\- Add comments only where the "why" isn't obvious from the code itself.

\- Keep functions focused and reasonably short.

\- Optimize for readability first, performance second, unless explicitly told otherwise.



Never claim something is "done," "tested," or "working" unless you've actually run it or the tests in this session and seen the result.



\## Critical: Ollama Model Loading for AI Service



**IMPORTANT FOR SEMINAR DEMO**: Ollama does NOT auto-load models after restart. If the AI service times out on chat/suggested questions, the model needs to be manually loaded. 

**Fixed Issue**: Script was using `settings.LLM_MODEL` but correct setting is `settings.OLLAMA_CHAT_MODEL` (now fixed)



\### Quick Fix (If AI Service is Hanging/Timing Out)

```bash
curl -X POST http://localhost:11434/api/pull -H "Content-Type: application/json" -d '{"name": "llama3.2:1b"}'
```

This loads the model into memory. Chat/generation will work after this (~30 seconds per request).



\### Automated Solution (RECOMMENDED)

Run the model loader script **before starting the AI service**:

```bash
# One-time load (exits after loading)
cd ai-service
python scripts/ensure_model_loaded.py

# Keep-alive mode (pings every 5 minutes to prevent unloading)
python scripts/ensure_model_loaded.py --keep-alive
```



\### Startup Sequence for Demo

```bash
# Terminal 1: Ensure model is loaded and keep it alive (WAIT for "Model loaded" message)
cd ai-service
python scripts/ensure_model_loaded.py --keep-alive

# Terminal 2: Start AI service (AFTER model is loaded)
cd ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Start backend
cd backend
npm run dev

# Terminal 4: Start frontend
cd frontend
npm run dev
```

**Why this matters**: Ollama unloads idle models after ~10-15 minutes. Without keep-alive, suggested questions will work initially but fail after idle time. The keep-alive script prevents this.



\### Verifying Model is Loaded

```bash
curl http://localhost:11434/api/ps
```

Should show `"models":[{"name":"llama3.1:8b",...}]`. If `"models":[]`, the model needs loading.



\## Session Handoff Protocol



At the end of every session, before we stop:

1\. Update PROJECT\_STATUS.md with:

&#x20;  - What was completed this session

&#x20;  - What's currently blocked (and why)

&#x20;  - What the immediate next step is

&#x20;  - Any environment/infra state that matters (e.g., "Redis/Ollama/Postgres now installed and running locally as of \[date]")



At the start of every new session, before doing anything else:

1\. Read PROJECT\_STATUS.md first to know exactly where we left off.

2\. Don't ask me to re-explain what's already documented there — just confirm your understanding in one or two lines and proceed.

