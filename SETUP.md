# RagCX Setup Guide for Windows

RagCX is a Retrieval-Augmented Generation (RAG) app where administrators upload PDF files to build a vector knowledge base, and users ask questions through a chat interface.

## Architecture Overview

The system consists of these services, each on its own port:
- **Frontend**: Next.js on `localhost:3000`
- **Backend API**: Node.js/Express on `localhost:4000` (API lives at `/api/v1`)
- **AI Service**: Python FastAPI on `localhost:8000`
- **Ollama**: LLM service on `localhost:11434`
- **ChromaDB**: Vector database (embedded, no separate service)
- **PostgreSQL**: Database on `localhost:5432`
- **Redis**: Cache/pub-sub on `localhost:6379`

## 1. Prerequisites

### Version Requirements
- **Git**: [Download Git for Windows](https://git-scm.com/download/win)
- **Node.js 22+**: [Download Node.js](https://nodejs.org/) (includes npm)
- **Python 3.12+** (tested on 3.13): [Download Python](https://www.python.org/downloads/)
- **PostgreSQL** (recent): [Download PostgreSQL](https://www.postgresql.org/download/windows/)
- **Redis**: Use Memurai (Windows-native Redis) from [Memurai download](https://www.memurai.com/get-memurai) or install Redis via WSL2
- **Ollama**: [Download Ollama](https://ollama.com/download/windows)

## 2. Install Ollama Models

Open PowerShell or Command Prompt and run:

```powershell
# Pull chat model (1B parameters)
ollama pull llama3.2:1b

# Pull embedding model  
ollama pull nomic-embed-text
```

## 3. Clone and Install Dependencies

```powershell
# Clone the repository
git clone https://github.com/Ankit65k/RagCX
cd RagCX

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies  
cd ../backend
npm install

# Install AI service dependencies
cd ../ai-service
python -m pip install -r requirements.txt
```

## 4. Environment Configuration

### Backend (`backend/.env`)
Copy the template and update it:
```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env`:
```bash
# Application
APP_ENV=development
APP_PORT=4000
APP_HOST=localhost
APP_API_PREFIX=/api
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD_HERE@localhost:5432/ragcx

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD_HERE
REDIS_DB=0

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=YOUR_JWT_ACCESS_SECRET_HERE
JWT_ACCESS_EXPIRATION=7d
JWT_REFRESH_SECRET=YOUR_JWT_REFRESH_SECRET_HERE
JWT_REFRESH_EXPIRATION=30d

# Storage (local filesystem by default)
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads

# S3 credentials (optional - for production)
STORAGE_BUCKET=YOUR_S3_BUCKET_HERE
STORAGE_ENDPOINT=YOUR_S3_ENDPOINT_HERE
STORAGE_REGION=YOUR_S3_REGION_HERE
STORAGE_ACCESS_KEY_ID=YOUR_S3_ACCESS_KEY_ID_HERE
STORAGE_SECRET_ACCESS_KEY=YOUR_S3_SECRET_ACCESS_KEY_HERE

# Logging & Utilities
LOG_LEVEL=info
BYPASS_RATE_LIMIT=false
UPLOAD_MAX_SIZE_BYTES=10485760
BCRYPT_SALT_ROUNDS=10
```

### Frontend (`frontend/.env.local`)
```powershell
cd ../frontend
Copy-Item .env.example .env.local
```

The file should contain:
```bash
# Backend API base URL. Format: http://<APP_HOST>:<APP_PORT><APP_API_PREFIX>/v1
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### AI Service (`ai-service/.env`)
```powershell
cd ../ai-service
Copy-Item .env.example .env
```

Key variables:
```bash
# LLM provider - defaults to Ollama (works without API key)
LLM_PROVIDER=ollama

# Ollama settings (must match your pulled models)
OLLAMA_CHAT_MODEL=llama3.2:1b
OLLAMA_EMBED_MODEL=nomic-embed-text

# Gemini settings (optional - see Section 8)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite

# Other OLLAMA_* and GEMINI_* values in ai-service/.env.example have good defaults and don't need changing
```

## 5. Database Setup

### PostgreSQL Setup
1. Install PostgreSQL and open pgAdmin or psql
2. Create a database named `ragcx`:
   ```sql
   CREATE DATABASE ragcx;
   ```

### Apply Database Migrations
```powershell
cd backend
npm run prisma:generate
npm run prisma:migrate
```

## 6. Starting Services

**Important**: First ensure Ollama, PostgreSQL, and Redis are already running, then:

Open three separate terminals:

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 - AI Service:**
```powershell
cd ai-service
python -m uvicorn app.main:app --port 8000
# Runs on http://localhost:8000
```

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## 7. Verify it works

1. Check backend health: http://localhost:4000/api/v1/health
2. Check AI service health: http://localhost:8000/api/v1/health  
3. Open frontend: http://localhost:3000
4. Register a new account
5. Upload a PDF document
6. Ask a question about the document content

## 8. Optional: Gemini Setup (Alternative to Ollama)

> ⚠️ **Warning**: Google's free tier may train their models on your prompts. Use Gemini only for non-sensitive PDFs. Never commit real API keys.

1. Get an API key from [Google AI Studio](https://aistudio.google.com/)
2. Edit `ai-service/.env`:
   ```bash
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your-actual-api-key-here
   GEMINI_MODEL=gemini-3.5-flash
   GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
   ```
3. Restart the AI service

## 9. Testing

### AI Service Tests
```powershell
cd ai-service
python -m pytest tests -q
# Should show 62 passed tests
```

### Database Health Check
```powershell
cd backend
npx tsx src/scripts/integration-test.ts
```

## 10. Troubleshooting

### Common Issues

**"Error: connect ECONNREFUSED 127.0.0.1:5432"**
- Ensure PostgreSQL is running
- Check database credentials in `backend/.env`

**"Ollama connection refused"**
- Verify Ollama is running: `ollama serve`
- Check `OLLAMA_BASE_URL` in `ai-service/.env` (default: `http://localhost:11434`)

**Redis connection issues on Windows**
- Use Memurai instead of Redis (compatible Redis server for Windows)
- Or install Redis via WSL2: `sudo apt install redis-server`

**"Module not found" errors**
- Reinstall dependencies: `npm install` or `pip install -r requirements.txt`
- Clear cache: `npm cache clean --force`

**Port conflicts**
- Frontend: `3000` → Change in `frontend/package.json` scripts
- Backend: `4000` → Change `APP_PORT` in `backend/.env`
- AI Service: `8000` → Change in the uvicorn command

---

Your RagCX installation is complete! Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- AI Service: http://localhost:8000
