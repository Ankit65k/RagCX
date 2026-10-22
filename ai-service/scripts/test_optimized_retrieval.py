#!/usr/bin/env python3
"""
Test script to verify retrieval optimization.
Run this AFTER restarting the AI service and testing 3 questions via frontend.

This script shows:
1. Service status
2. Current configuration
3. Raw Ollama speed (baseline for comparison)
"""
import asyncio
import httpx
import time
import re
from datetime import datetime

OLLAMA_URL = "http://localhost:11434"
AI_SERVICE_URL = "http://localhost:8000"

TEST_QUESTIONS = [
    "What are the safety regulations for ventilation?",
    "How should hazardous materials be stored?",
    "What are the requirements for emergency exits?",
]


async def check_services():
    """Check if services are running."""
    print("=" * 80)
    print("SERVICE STATUS")
    print("=" * 80)

    async with httpx.AsyncClient(timeout=5.0) as client:
        # AI Service
        try:
            resp = await client.get(f"{AI_SERVICE_URL}/api/v1/health")
            data = resp.json()
            print(f"✓ AI Service (port 8000): ONLINE")
            services = data.get("services", {})
            print(f"  - Redis: {services.get('redis', 'unknown')}")
            print(f"  - Ollama: {services.get('ollama', 'unknown')}")
        except Exception as e:
            print(f"✗ AI Service (port 8000): OFFLINE - {str(e)[:50]}")
            return False

        # Ollama
        try:
            resp = await client.get(f"{OLLAMA_URL}/api/ps")
            data = resp.json()
            models = data.get("models", [])
            print(f"✓ Ollama (port 11434): {len(models)} models loaded")
            for m in models[:2]:
                print(f"  - {m['name']}")
        except Exception as e:
            print(f"✗ Ollama (port 11434): OFFLINE")
            return False

    return True


def show_config():
    """Show current optimization configuration."""
    print("\n" + "=" * 80)
    print("OPTIMIZATION CONFIGURATION")
    print("=" * 80)
    print("""
✓ top_k: 3 chunks
  Location: ai-service/app/workflows/nodes/chat/retrieve.py:32
  Status: Applied ✓

✓ MAX_CHUNK_CHARS: 800 characters per chunk
  Location: ai-service/app/retrievers/services.py:52
  Status: Already set ✓

EXPECTED METRICS PER QUESTION:
  - Chunks retrieved: 3 (max)
  - Characters per chunk: ~800 (max after truncation)
  - Total context size: ~2,400 chars
  - Full prompt size: ~3,300 chars
  - Expected response time: 20-35 seconds

PREVIOUS METRICS (before optimization):
  - Chunks retrieved: 5
  - Total context size: ~4,000 chars
  - Full prompt size: ~5,000 chars
  - Response time was: 45-120 seconds
    """)


async def test_ollama_raw_speed():
    """Test raw Ollama inference speed (baseline)."""
    print("=" * 80)
    print("RAW OLLAMA SPEED TEST (No RAG overhead)")
    print("=" * 80)

    async with httpx.AsyncClient(timeout=120.0) as client:
        times = []

        for i, question in enumerate(TEST_QUESTIONS, 1):
            print(f"\n[{i}/{len(TEST_QUESTIONS)}] {question}")

            start = time.perf_counter()
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": "llama3.2:1b",
                        "prompt": f"Answer in one sentence: {question}",
                        "stream": False,
                        "options": {"num_predict": 50}
                    }
                )
                elapsed = time.perf_counter() - start
                times.append(elapsed)

                if resp.status_code == 200:
                    data = resp.json()
                    tokens = data.get("eval_count", 0)
                    print(f"  ✓ {elapsed:.2f}s | {tokens} tokens")
                    print(f"    → {data.get('response', '')[:80]}")
                else:
                    print(f"  ✗ Error: {resp.status_code}")

            except asyncio.TimeoutError:
                print(f"  ✗ Timeout (120s)")
            except Exception as e:
                print(f"  ✗ Error: {str(e)[:60]}")

            await asyncio.sleep(1)

        if times:
            print(f"\n  Average: {sum(times) / len(times):.2f}s")


def show_next_steps():
    """Show what to do next."""
    print("\n" + "=" * 80)
    print("NEXT STEPS - TO MEASURE RETRIEVAL IMPACT")
    print("=" * 80)
    print("""
1. RESTART the AI service (this script won't see the change otherwise):
   - Stop current process with Ctrl+C
   - Restart: python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

2. TEST via Frontend with these 3 questions:
   a) "What are the safety regulations for ventilation?"
   b) "How should hazardous materials be stored?"
   c) "What are the requirements for emergency exits?"

3. MEASURE - Watch the AI service logs for these lines:
   [retrieve_context] Retrieved N chunks in Xms
   [generate_prompt] Prompt assembled (N chars)

4. RECORD the response times (from frontend)

EXPECTED RESULTS AFTER OPTIMIZATION:
   - Chunks: 3 (was 5)
   - Prompt chars: ~3,300 (was ~5,000)
   - Response time: 20-35s (was 45-120s)
   - Speedup: 2-4x faster than before
    """)


async def main():
    print("\n" + "=" * 80)
    print(f"RETRIEVAL OPTIMIZATION TEST - {datetime.utcnow().strftime('%H:%M:%S UTC')}")
    print("=" * 80 + "\n")

    # Check services
    if not await check_services():
        print("\n⚠️  Services not running. Start AI service and Ollama first.")
        return

    # Show config
    show_config()

    # Test raw speed
    await test_ollama_raw_speed()

    # Next steps
    show_next_steps()


if __name__ == "__main__":
    asyncio.run(main())
