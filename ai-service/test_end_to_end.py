"""
End-to-end test for suggested questions generation with improved model and logging.
This simulates the real flow: document upload -> processing -> question generation.
"""
import asyncio
import time
import uuid
import httpx
import json
from typing import Dict, Any

async def test_single_document(document_path: str) -> Dict[str, Any]:
    """Test a single document from upload to question generation."""
    print(f"\n{'='*80}")
    print(f"TESTING: {document_path}")
    print(f"{'='*80}")

    start_time = time.perf_counter()
    document_id = str(uuid.uuid4())
    request_id = f"test-{uuid.uuid4().hex[:8]}"

    # 1. Simulate document processing (just store file and generate chunks)
    print(f"[{request_id}] Step 1: Document processing...")

    # We'll simulate by directly triggering question generation on existing chunks
    # First, let's see if we can trigger the actual Redis event

    # 2. Create Redis event for question generation
    event = {
        "eventId": str(uuid.uuid4()),
        "eventType": "SUGGESTED_QUESTIONS_REQUEST",
        "version": "1.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "correlationId": str(uuid.uuid4()),
        "requestId": request_id,
        "producer": "ragcx-ai-service",
        "payload": {
            "documentId": document_id,
        },
        "metadata": {}
    }

    print(f"[{request_id}] Step 2: Triggering question generation...")

    # 3. Manually call the AI service question generation endpoint
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Get chunks from vector store first
            response = await client.post(
                "http://localhost:8000/api/v1/questions/generate",
                json={"documentId": document_id},
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                result = response.json()
                elapsed = time.perf_counter() - start_time
                print(f"[{request_id}] ✓ Generation completed in {elapsed:.2f}s")
                print(f"   Questions generated: {len(result.get('questions', []))}")

                for i, q in enumerate(result.get('questions', [])[:3], 1):
                    print(f"   Q{i}: {q.get('question', '')[:80]}...")

                return {
                    "document_id": document_id,
                    "request_id": request_id,
                    "elapsed_seconds": round(elapsed, 2),
                    "questions_count": len(result.get('questions', [])),
                    "questions": result.get('questions', []),
                    "success": True
                }
            else:
                elapsed = time.perf_counter() - start_time
                print(f"[{request_id}] ✗ Generation failed: {response.status_code} {response.text[:200]}")
                return {
                    "document_id": document_id,
                    "request_id": request_id,
                    "elapsed_seconds": round(elapsed, 2),
                    "questions_count": 0,
                    "questions": [],
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text[:200]}"
                }
    except Exception as e:
        elapsed = time.perf_counter() - start_time
        print(f"[{request_id}] ✗ Generation error: {str(e)}")
        return {
            "document_id": document_id,
            "request_id": request_id,
            "elapsed_seconds": round(elapsed, 2),
            "questions_count": 0,
            "questions": [],
            "success": False,
            "error": str(e)
        }

async def test_ai_service_health():
    """Test if AI service is running."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8000/health")
            if response.status_code == 200:
                print("✓ AI Service is running")
                return True
            else:
                print(f"✗ AI Service health check failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ AI Service not reachable: {e}")
        return False

async def test_ollama_health():
    """Test if Ollama is running with llama3.2:1b."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check model is loaded
            response = await client.get("http://localhost:11434/api/ps")
            if response.status_code == 200:
                models = response.json().get("models", [])
                if any(m["name"] == "llama3.2:1b" for m in models):
                    print("✓ llama3.2:1b is loaded in Ollama")
                    return True
                else:
                    print("✗ llama3.2:1b not loaded, loading...")
                    # Load model
                    load_response = await client.post(
                        "http://localhost:11434/api/pull",
                        json={"name": "llama3.2:1b"}
                    )
                    print(f"  Model load response: {load_response.status_code}")
                    return load_response.status_code == 200
            else:
                print(f"✗ Ollama API failed: {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ Ollama not reachable: {e}")
        return False

async def test_simple_generation():
    """Test simple question generation with chunks."""
    print("\nTesting simple generation with sample chunks...")

    request_id = f"simple-test-{uuid.uuid4().hex[:8]}"
    start_time = time.perf_counter()

    # Simulate chunks from a machine learning document
    sample_chunks = [
        {
            "text": "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms that can learn from and make predictions on data.",
            "pageNumber": 1,
            "chunkIndex": 0,
            "documentId": "test-doc-1",
            "chunkId": "chunk-1"
        },
        {
            "text": "There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.",
            "pageNumber": 1,
            "chunkIndex": 1,
            "documentId": "test-doc-1",
            "chunkId": "chunk-2"
        },
        {
            "text": "Deep learning is a subset of machine learning that uses neural networks with multiple layers.",
            "pageNumber": 2,
            "chunkIndex": 2,
            "documentId": "test-doc-1",
            "chunkId": "chunk-3"
        }
    ]

    # Build prompt similar to the real one
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
                        "num_predict": 200,
                    }
                }
            )
            elapsed = time.perf_counter() - start_time

            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")

            try:
                parsed = json.loads(content)
                questions = parsed.get("questions", [])

                print(f"[{request_id}] ✓ Simple test completed in {elapsed:.2f}s")
                print(f"   Generated {len(questions)} questions")
                print(f"   Raw response preview: {content[:200]}...")

                for i, q in enumerate(questions[:3], 1):
                    question_text = q.get("question", "")
                    pages = q.get("related_pages", [])
                    print(f"   Q{i}: {question_text[:80]}... (pages: {pages})")

                return True
            except json.JSONDecodeError as e:
                print(f"[{request_id}] ✗ JSON parse error: {e}")
                print(f"   Raw response: {content[:500]}")
                return False
    except Exception as e:
        elapsed = time.perf_counter() - start_time
        print(f"[{request_id}] ✗ Test error: {str(e)} (took {elapsed:.2f}s)")
        return False

async def main():
    print("END-TO-END TEST FOR SUGGESTED QUESTIONS")
    print("=" * 80)

    # Test system health
    print("\n1. System Health Check:")
    ai_ok = await test_ai_service_health()
    ollama_ok = await test_ollama_health()

    if not ai_ok or not ollama_ok:
        print("❌ System not ready for testing")
        return

    # Test simple generation
    print("\n2. Simple Generation Test:")
    simple_ok = await test_simple_generation()

    if not simple_ok:
        print("❌ Simple generation test failed")
        return

    # Test multiple documents
    print("\n3. Document Tests (simulated):")

    # Test 1: ML document
    results_1 = await test_single_document("machine_learning_doc.pdf")

    # Wait between tests
    print("\nWaiting 10 seconds between tests...")
    await asyncio.sleep(10)

    # Test 2: AI document (same chunks, should produce same results)
    results_2 = await test_single_document("ai_overview_doc.pdf")

    # Summary
    print(f"\n{'='*80}")
    print("TEST SUMMARY")
    print(f"{'='*80}")

    for i, result in enumerate([results_1, results_2], 1):
        if result:
            status = "✓ PASS" if result.get("success") else "✗ FAIL"
            print(f"Document {i} ({result.get('document_id', '')}):")
            print(f"  {status} - {result.get('questions_count', 0)} questions in {result.get('elapsed_seconds', 0)}s")
            if result.get("error"):
                print(f"  Error: {result.get('error', '')}")

if __name__ == "__main__":
    asyncio.run(main())
