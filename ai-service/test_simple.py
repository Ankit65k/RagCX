"""
Simple test for suggested questions generation with improved model.
"""
import asyncio
import time
import json
import httpx

async def test_simple_generation():
    """Test simple question generation with chunks."""
    print("\n[TEST] Simple Question Generation with llama3.2:1b")
    print("=" * 60)

    request_id = f"test-{int(time.time())}"
    start_time = time.perf_counter()

    # Simulate chunks from a machine learning document
    sample_chunks = [
        {
            "text": "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms that can learn from and make predictions on data.",
            "pageNumber": 1,
            "chunkIndex": 0,
        },
        {
            "text": "There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.",
            "pageNumber": 1,
            "chunkIndex": 1,
        },
        {
            "text": "Deep learning is a subset of machine learning that uses neural networks with multiple layers.",
            "pageNumber": 2,
            "chunkIndex": 2,
        },
        {
            "text": "Common applications of machine learning include recommendation systems, fraud detection, and natural language processing.",
            "pageNumber": 2,
            "chunkIndex": 3,
        }
    ]

    # Build prompt
    content = "\n\n".join([f"[Page {c['pageNumber']}, Chunk {c['chunkIndex']}]\n{c['text']}" for c in sample_chunks])

    prompt = f"""You are a professional document analyst.
Your task is to analyze the provided document excerpts and generate questions that this document can ANSWER.

IMPORTANT:
1. Generate ONLY questions that the text below can ANSWER.
2. Do NOT write general questions. Write SPECIFIC questions about the actual content.
3. Do NOT use outside knowledge. Only use the provided text.
4. Each question must be answerable from the context provided.

You MUST respond with a valid JSON object matching this structure:
{{
  "questions": [
    {{
      "question": "The specific question text",
      "related_pages": [page numbers],
      "confidence": "HIGH" | "MEDIUM" | "LOW"
    }}
  ]
}}

--- CONTEXT EXCERPTS ---
{content}

Generate exactly 5 suggested questions based ONLY on the context above."""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            print(f"[{request_id}] Calling Ollama API...")

            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "llama3.2:1b",
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096,
                        "num_predict": 600,
                    }
                }
            )
            elapsed = time.perf_counter() - start_time

            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")

            print(f"[{request_id}] Response received in {elapsed:.2f}s")
            print(f"[{request_id}] Raw response length: {len(content)} chars")

            try:
                parsed = json.loads(content)
                questions = parsed.get("questions", [])

                print(f"\n[{request_id}] SUCCESS: Generated {len(questions)} questions")
                print(f"\nQuestions:")

                for i, q in enumerate(questions, 1):
                    question_text = q.get("question", "")
                    pages = q.get("related_pages", [])
                    confidence = q.get("confidence", "UNKNOWN")
                    print(f"  {i}. {question_text}")
                    print(f"     Pages: {pages}, Confidence: {confidence}")

                return {
                    "success": True,
                    "elapsed": elapsed,
                    "questions": questions
                }

            except json.JSONDecodeError as e:
                print(f"\n[{request_id}] PARSE ERROR: {e}")
                print(f"Raw response: {content[:500]}")
                return {
                    "success": False,
                    "error": "JSON parse error",
                    "raw_response": content[:500]
                }

    except httpx.TimeoutException:
        elapsed = time.perf_counter() - start_time
        print(f"\n[{request_id}] TIMEOUT after {elapsed:.2f}s")
        return {"success": False, "error": "Timeout"}

    except Exception as e:
        elapsed = time.perf_counter() - start_time
        print(f"\n[{request_id}] ERROR: {e} (after {elapsed:.2f}s)")
        return {"success": False, "error": str(e)}

async def main():
    print("\nQUESTION GENERATION TEST")
    print("=" * 60)

    # Run 3 tests
    results = []
    for run in range(1, 4):
        print(f"\n--- Run {run}/3 ---")
        result = await test_simple_generation()
        results.append(result)

        if run < 3:
            print(f"\nWaiting 5 seconds before next run...")
            await asyncio.sleep(5)

    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")

    successes = [r for r in results if r.get("success")]
    failures = [r for r in results if not r.get("success")]

    print(f"Success: {len(successes)}/{len(results)}")

    if successes:
        times = [r["elapsed"] for r in successes]
        print(f"Avg time: {sum(times)/len(times):.2f}s")
        print(f"Min time: {min(times):.2f}s")
        print(f"Max time: {max(times):.2f}s")

    if failures:
        print(f"\nFailures:")
        for i, f in enumerate(failures, 1):
            print(f"  {i}. {f.get('error', 'Unknown error')}")

if __name__ == "__main__":
    asyncio.run(main())
