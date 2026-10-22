"""
Diagnostic test: Does llama3:latest hang on simple content too,
or only on complex document chunks?
"""
import asyncio
import httpx
import json
import time

OLLAMA_BASE_URL = "http://localhost:11434"
MODEL = "llama3.1:8b"

async def test_simple_question_generation():
    """Test with minimal, simple content"""

    simple_payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant that generates questions. Return JSON only."
            },
            {
                "role": "user",
                "content": """Based on this content, generate 3 questions:

Content: "The sky is blue. Water is wet. Dogs bark."

Return JSON format:
{"questions": [{"question": "...", "related_pages": [1], "confidence": "HIGH"}]}"""
            }
        ],
        "stream": False,
        "format": "json"
    }

    print("="*80)
    print("TEST 1: Simple content WITH format='json'")
    print("="*80)
    print(json.dumps(simple_payload, indent=2))
    print("="*80)

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            start = time.time()
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=simple_payload
            )
            elapsed = time.time() - start

            print(f"SUCCESS in {elapsed:.2f}s")
            print("Response:")
            print(response.json())

        except httpx.TimeoutException:
            print(f"TIMEOUT after 20 seconds")
        except Exception as e:
            print(f"ERROR: {e}")

    print("\n" + "="*80)
    print("TEST 2: Simple content WITHOUT format='json'")
    print("="*80)

    # Test without JSON mode
    simple_payload_no_json = simple_payload.copy()
    del simple_payload_no_json["format"]

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            start = time.time()
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=simple_payload_no_json
            )
            elapsed = time.time() - start

            print(f"SUCCESS in {elapsed:.2f}s")
            print("Response:")
            print(response.json())

        except httpx.TimeoutException:
            print(f"TIMEOUT after 20 seconds")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_simple_question_generation())
