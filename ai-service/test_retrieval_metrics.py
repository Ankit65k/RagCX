"""
Quick test to verify retrieval configuration and measure timings.
Run this when AI service is running, then test via frontend to see actual logs.
"""
import asyncio
import httpx
import time
from datetime import datetime

AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:4000"

TEST_QUESTIONS = [
    "What are the safety regulations for ventilation?",
    "How should hazardous materials be stored?",
    "What are the requirements for emergency exits?",
]


async def test_ai_service():
    """Check if services are running."""
    print("=" * 70)
    print("SERVICE STATUS CHECK")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=5.0) as client:
        # Check AI service
        try:
            resp = await client.get(f"{AI_SERVICE_URL}/api/v1/health")
            print(f"AI Service (8000): {resp.json()}")
        except Exception as e:
            print(f"AI Service (8000): OFFLINE - {e}")

        # Check Backend
        try:
            resp = await client.get(f"{BACKEND_URL}/api/version")
            print(f"Backend (4000): ONLINE")
        except Exception as e:
            print(f"Backend (4000): OFFLINE - {e}")

    print("\n" + "=" * 70)
    print("CURRENT RETRIEVAL CONFIGURATION")
    print("=" * 70)
    print("""
CONFIG SOURCE: ai-service/app/chat/context.py (line 21)
  - top_k: 3 chunks (default)

CONFIG SOURCE: ai-service/app/retrievers/services.py (line 52)
  - MAX_CHUNK_CHARS: 800 characters per chunk

WHAT HAPPENS PER QUESTION:
  1. Query embeds to vector (~200ms on CPU)
  2. ChromaDB similarity_search retrieves top_k=3 chunks
  3. Each chunk is truncated to 800 chars max
  4. Context is built: ~3 chunks × ~800 chars = ~2400 chars max
  5. Full prompt: 800 (system) + 2400 (context) + ~100 (question) = ~3300 chars

EXPECTED TIMINGS (CPU):
  - Embedding: 200-500ms
  - Retrieval: 50-200ms
  - LLM generation: 10-30s for 1b model
  - TOTAL: 15-35 seconds per response
    """)
    print("=" * 70)


async def test_direct_ollama():
    """Test raw Ollama timing without RAG."""
    print("\n" + "=" * 70)
    print("TESTING RAW OLLAMA SPEED (no RAG)")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, question in enumerate(TEST_QUESTIONS, 1):
            print(f"\n[{i}/{len(TEST_QUESTIONS)}] {question}")

            start = time.perf_counter()
            try:
                resp = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": f"Answer briefly: {question}",
                        "stream": False,
                        "options": {"num_predict": 100}
                    }
                )
                elapsed = time.perf_counter() - start
                data = resp.json()

                print(f"  Time: {elapsed:.2f}s")
                print(f"  Response: {data.get('response', '')[:80]}...")
                print(f"  Tokens: {data.get('eval_count', '?')}")

            except Exception as e:
                print(f"  Error: {e}")

            await asyncio.sleep(1)


async def main():
    await test_ai_service()
    await test_direct_ollama()


if __name__ == "__main__":
    asyncio.run(main())