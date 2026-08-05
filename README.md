# RagCX - PDF Knowledge Base AI Chatbot (RAG System)

An enterprise-grade, high-performance Retrieval-Augmented Generation (RAG) platform. Administrators can upload PDF files to build a vector knowledge base, and users can ask questions through a chat interface. The system uses a microservice architecture communicating via Redis Pub/Sub.

---

## 1. System Architecture

```
                       ┌─────────────────────────┐
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
```

---

## 2. Directory Structure

- **`/frontend`**: Next.js App Router workspace, styled with Tailwind CSS & Shadcn/UI, using TanStack Query & Zustand.
- **`/backend`**: Express app implementing PostgreSQL persistence via Prisma ORM and Pub/Sub connections.
- **`/ai-service`**: Python FastAPI app organizing LangGraph nodes for Retrieval-Augmented Generation.
- **`/shared`**: Cross-service payloads, events channels definitions, and schemas.
- **`/docs`**: API documents and architecture specifications.

---

## 3. First-Time Installation & Setup

Follow these steps if you are setting up and running the project for the very first time.

### Step 1: Configure Databases & Prerequisites
1. Ensure you have **PostgreSQL** and **Redis** installed and running on your local machine:
   - **PostgreSQL**: Create a database named `ragcx` on port `5432`.
   - **Redis**: Ensure the server is active on port `6379`.
2. Ensure you have **Ollama** installed and running locally on port `11434` with your preferred model downloaded (e.g. `llama3` or `mistral`).

### Step 2: Configure Environment Files
1. **Backend Config**: Create a `.env` file in the `backend/` directory:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ragcx"
   REDIS_URL="redis://localhost:6379"
   JWT_ACCESS_SECRET="super-secret-access-token-key-change-in-production"
   JWT_REFRESH_SECRET="super-secret-refresh-token-key-change-in-production"
   ```
2. **Frontend Config**: Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
   ```
3. **AI Service Config**: Create a `.env` file in the `ai-service/` directory:
   ```env
   REDIS_URL="redis://localhost:6379"
   CHROMA_DB_PATH="./chroma_db"
   OLLAMA_BASE_URL="http://localhost:11434"
   ```

### Step 3: Install Service Dependencies & Prepare Database
1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   npx prisma db push
   ```
2. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```
3. **AI Service Setup**:
   ```bash
   cd ../ai-service
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

---

## 4. How to Start the Complete Project

Once installed, open three terminal windows to launch the active components:

### 1. Start the Backend API (Terminal 1)
```bash
cd backend
npm run dev
# Service starts on http://localhost:4000/api/v1
```

### 2. Start the AI Microservice (Terminal 2)
```bash
cd ai-service
# Activate virtual environment
.\.venv\Scripts\activate
python -m uvicorn app.main:app --port 8000
# Service starts on http://localhost:8000
```

### 3. Start the Next.js Frontend Portal (Terminal 3)
```bash
cd frontend
npm run dev
# Web application starts on http://localhost:3000
```

---

## 5. Verification & Tests

### Run Automated Integration & Security Audits
To execute verification scripts, run the following in the `backend/` directory:
```bash
# Verify End-to-End processing and RAG workflows
npx tsx src/scripts/integration-test.ts

# Audit role permissions, SQL injection, and rate limiting boundaries
npx tsx src/scripts/security-validation.ts
```
