# RagCX - PDF Knowledge Base AI Chatbot (RAG System)

An enterprise-grade, high-performance Retrieval-Augmented Generation (RAG) platform. Administrators can upload PDF files to build a vector knowledge base, and users can ask questions through a chat interface. The system uses a microservice architecture communicating via Redis Pub/Sub.

## System Architecture                   ┌─────────────────────────┐
                   │     Next.js Frontend    │
                   └────────────┬────────────┘
                                │ HTTP / REST
                                ▼
                   ┌─────────────────────────┐
                   │   Node.js/Express API   │
                   └────────────┬────────────┘
                                │ Redis Pub/Sub
                                ▼
                   ┌─────────────────────────┐
                   │    Python AI Service    │
                   └──────┬────────────┬─────┘
                          │            │
                          ▼            ▼
                    ┌──────────┐ ┌───────────┐
                    │ ChromaDB │ │PostgreSQL │
                    └──────────┘ └───────────┘

## Directory Structure

- **`/frontend`**: Next.js App Router workspace, styled with Tailwind CSS & Shadcn/UI, using TanStack Query & Zustand.
- **`/backend`**: Express app implementing PostgreSQL persistence via Prisma ORM and Pub/Sub connections.
- **`/ai-service`**: Python FastAPI app organizing LangGraph nodes for Retrieval-Augmented Generation.
- **`/shared`**: Cross-service payloads, events channels definitions, and schemas.
- **`/docs`**: API documents and architecture specifications.

## Local Environment (already set up on this machine)

- **PostgreSQL**: database `ragcx` on port 5432. Use your own PostgreSQL password in DATABASE_URL, e.g. postgresql://postgres:YOUR_DB_PASSWORD_HERE@localhost:5432/ragcx.
- **Redis**: running via Memurai on port 6379 (Windows-native Redis alternative).
- **Ollama**: installed, `llama3` model pulled, running on port 11434.
- **Known fixes already applied**: missing `src/core/env/index.ts` module was created; a PORT env leak from the omniroute shell environment was fixed with `dotenv.config({ override: true })`; an incorrect `requireRole('ADMIN')` check on document upload was replaced with `requirePermission(Permission.DOCUMENTS_UPLOAD)` — check for the same bug pattern on other routes before assuming they're correct.

## How to Start the Complete Project

Three terminals, each left running:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# http://localhost:4000/api/v1

# Terminal 2 — AI Service
cd ai-service
python -m uvicorn app.main:app --port 8000
# http://localhost:8000

# Terminal 3 — Frontend
cd frontend
npm run dev
# http://localhost:3000
```

## Verification & Tests

```bash
# Verify End-to-End processing and RAG workflows
cd backend
npx tsx src/scripts/integration-test.ts

# Audit role permissions, SQL injection, and rate limiting boundaries
npx tsx src/scripts/security-validation.ts
```

---

## Development Guidelines

Before making any change, always:
1. Read the actual file(s) involved — never assume a function, import, variable, or API exists. If unsure, search/grep for it or check the docs/package before using it.
2. If uncertain about a fact (a library's API, a config option, version-specific behavior), say so and verify it rather than guessing.
3. After any change, verify it — read the modified file back, run relevant tests, or run the app/build before saying the task is done.

For code style:
- Match existing naming, folder structure, and patterns already used in this repo instead of introducing a generic style.
- Prefer clear, readable code over clever one-liners. Use meaningful variable/function names.
- Avoid unnecessary abstraction, premature optimization, or over-engineering.
- Add comments only where the "why" isn't obvious from the code itself.
- Keep functions focused and reasonably short.
- Optimize for readability first, performance second, unless explicitly told otherwise.

Never claim something is "done," "tested," or "working" unless you've actually run it or the tests in this session and seen the result.

## Session Handoff Protocol

At the end of every session, before we stop:
1. Update PROJECT_STATUS.md with:
   - What was completed this session
   - What's currently blocked (and why)
   - What the immediate next step is
   - Any environment/infra state that matters

At the start of every new session, before doing anything else:
1. Read PROJECT_STATUS.md first to know exactly where we left off.
2. Don't ask me to re-explain what's already documented there — just confirm your understanding in one or two lines and proceed.