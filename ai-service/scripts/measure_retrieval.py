"""
Retrieval Metrics Script - Run from ai-service directory
Usage: python scripts/measure_retrieval.py

This script measures retrieval metrics and timing when you test via the frontend.
Check the AI service terminal logs for:
  - [retrieve_context] Retrieved N chunks in Xms
  - [generate_prompt] Prompt assembled (N chars)
"""
import asyncio
import httpx
import time
from datetime import datetime

AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:4000"
OLLAMA_URL = "http://localhost:11434"

TEST_QUESTIONS = [
    "What are the safety regulations for ventilation?",
    "How should hazardous materials be stored?",
    "What are the requirements for emergency exits?",
]


async def check_services():
    """Quick service health check."""
    print("=" * 70)
    print("SERVICE STATUS")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{AI_SERVICE_URL}/api/v1/health")
            print(f"AI Service (8000): {resp.json().get('services', {})}")
        except Exception as e:
            print(f"AI Service (8000): OFFLINE - {str(e)[:50]}")

        try:
            resp = await client.get(f"{OLLAMA_URL}/api/ps")
            models = resp.json().get("models", [])
            print(f"Ollama: {len(models)} models loaded")
            for m in models[:3]:
                print(f"  - {m['name']}")
        except Exception as e:
            print(f"Ollama: OFFLINE")


async def show_current_config():
    """Show current retrieval configuration."""
    print("\n" + "=" * 70)
    print("CURRENT RETRIEVAL CONFIG")
    print("=" * 70)

    print("""
FILE: ai-service/app/chat/context.py (line 21)
  top_k = request.metadata.get("top_k", 3)  # ← Already 3 chunks!

FILE: ai-service/app/retrievers/services.py (line 52)
  MAX_CHUNK_CHARS = 800  # ← Already 800 chars per chunk!

EXPECTED PER QUESTION:
  - Chunks retrieved: 3 (max)
  - Chars per chunk: ~800 (max after truncation)
  - Total context: ~2,400 chars
  - Full prompt: ~3,300 chars

If logs show MORE chunks or LARGER context, the config isn't being applied.
    """)


async def test_raw_ollama_speed():
    """Test raw Ollama speed (no RAG overhead)."""
    print("=" * 70)
    print("RAW OLLAMA SPEED TEST (no RAG)")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=120.0) as client:
        for i, question in enumerate(TEST_QUESTIONS, 1):
            print(f"\n[{i}/{len(TEST_QUESTIONS)}] {question}")

            start = time.perf_counter()
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": f"Answer briefly in one sentence: {question}",
                        "stream": False,
                        "options": {"num_predict": 50}
                    }
                )
                elapsed = time.perf_counter() - start
                data = resp.json()

                print(f"  Time: {elapsed:.2f}s | Tokens: {data.get('eval_count', '?')}")
                print(f"  → {data.get('response', '')[:100]}")

            except Exception as e:
                print(f"  Error: {str(e)[:60]}")

            await asyncio.sleep(1)


async def main():
    print("\n" + "=" * 70)
    print(f"RETRIEVAL METRICS - {datetime.utcnow().strftime('%H:%M:%S')}")
    print("=" * 70 + "\n")

    await check_services()
    await show_current_config()
    await test_raw_ollama_speed()

    print("\n" + "=" * 70)
    print("TO SEE ACTUAL RETRIEVAL METRICS:")
    print("1. Run questions via frontend")
    print("2. Check AI service terminal logs for:")
    print("   - [retrieve_context] Retrieved N chunks in Xms")
    print("   - [generate_prompt] Prompt assembled (N chars)")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())