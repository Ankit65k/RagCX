"""
Test script to compare llama3.2:1b vs llama3.2:3b for question generation.
Tests timing and quality with real chunks.
"""
import asyncio
import time
import json
import httpx
from typing import List, Dict

# Sample chunks (simulating document content)
SAMPLE_CHUNKS = [
    {
        "text": "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms that can learn from and make predictions on data. It uses statistical techniques to give computers the ability to learn without being explicitly programmed.",
        "pageNumber": 1,
        "chunkIndex": 0
    },
    {
        "text": "There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data.",
        "pageNumber": 1,
        "chunkIndex": 1
    },
    {
        "text": "Deep learning is a subset of machine learning that uses neural networks with multiple layers. These deep neural networks can automatically learn hierarchical representations of data, making them particularly effective for tasks like image recognition and natural language processing.",
        "pageNumber": 2,
        "chunkIndex": 2
    },
    {
        "text": "Common applications of machine learning include recommendation systems, fraud detection, natural language processing, computer vision, and predictive analytics. Companies use ML to analyze customer behavior, optimize operations, and make data-driven decisions.",
        "pageNumber": 2,
        "chunkIndex": 3
    }
]

PROMPT_TEMPLATE = """You are an AI assistant analyzing a document. Based on the content below, generate exactly 5 questions that a user might ask about this document.

Document Content:
{content}

Generate exactly 5 questions that are:
- Specific to the content provided
- Answerable from the document
- Varied in scope (some specific, some general)

Return ONLY a JSON object in this exact format with no additional text:
{{"questions": ["question 1?", "question 2?", "question 3?", "question 4?", "question 5?"]}}"""

async def test_model(model_name: str, chunks: List[Dict], runs: int = 3) -> Dict:
    """Test a model multiple times and return timing + results."""
    print(f"\n{'='*60}")
    print(f"Testing model: {model_name}")
    print(f"{'='*60}")

    # Build content from chunks
    content = "\n\n".join([f"[Page {c['pageNumber']}, Chunk {c['chunkIndex']}]\n{c['text']}" for c in chunks])
    prompt = PROMPT_TEMPLATE.format(content=content)

    results = []

    async with httpx.AsyncClient(timeout=120.0) as client:
        for run in range(runs):
            print(f"\nRun {run + 1}/{runs}...")
            start = time.perf_counter()

            try:
                response = await client.post(
                    "http://localhost:11434/api/chat",
                    json={
                        "model": model_name,
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
                elapsed = time.perf_counter() - start

                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "")

                # Parse JSON response
                try:
                    parsed = json.loads(content)
                    questions = parsed.get("questions", [])
                    question_count = len(questions)

                    print(f"  OK Completed in {elapsed:.2f}s")
                    print(f"  OK Generated {question_count} questions")

                    results.append({
                        "run": run + 1,
                        "elapsed_seconds": round(elapsed, 2),
                        "question_count": question_count,
                        "questions": questions,
                        "raw_response": content[:200] + "..." if len(content) > 200 else content,
                        "success": True,
                        "error": None
                    })

                except json.JSONDecodeError as e:
                    print(f"  FAIL JSON parse error: {e}")
                    results.append({
                        "run": run + 1,
                        "elapsed_seconds": round(elapsed, 2),
                        "question_count": 0,
                        "questions": [],
                        "raw_response": content[:200] + "..." if len(content) > 200 else content,
                        "success": False,
                        "error": f"JSON parse failed: {str(e)}"
                    })

            except httpx.TimeoutException as e:
                elapsed = time.perf_counter() - start
                print(f"  FAIL Timeout after {elapsed:.2f}s")
                results.append({
                    "run": run + 1,
                    "elapsed_seconds": round(elapsed, 2),
                    "question_count": 0,
                    "questions": [],
                    "raw_response": "",
                    "success": False,
                    "error": "Timeout"
                })
            except Exception as e:
                elapsed = time.perf_counter() - start
                print(f"  FAIL Error: {e}")
                results.append({
                    "run": run + 1,
                    "elapsed_seconds": round(elapsed, 2),
                    "question_count": 0,
                    "questions": [],
                    "raw_response": "",
                    "success": False,
                    "error": str(e)
                })

    # Calculate stats
    successful_runs = [r for r in results if r["success"]]
    if successful_runs:
        times = [r["elapsed_seconds"] for r in successful_runs]
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)

        print(f"\nSTATS for {model_name}:")
        print(f"  Success rate: {len(successful_runs)}/{runs}")
        print(f"  Avg time: {avg_time:.2f}s")
        print(f"  Min time: {min_time:.2f}s")
        print(f"  Max time: {max_time:.2f}s")
    else:
        print(f"\nFAIL All runs failed for {model_name}")
        avg_time = None

    return {
        "model": model_name,
        "runs": results,
        "stats": {
            "success_rate": f"{len(successful_runs)}/{runs}",
            "avg_time": avg_time,
            "min_time": min(times) if successful_runs else None,
            "max_time": max(times) if successful_runs else None,
        }
    }

async def main():
    print(f"\nQUESTION Generation Model Comparison Test")
    print(f"Testing with {len(SAMPLE_CHUNKS)} chunks on machine learning topic")

    # Test both models
    results_1b = await test_model("llama3.2:1b", SAMPLE_CHUNKS, runs=3)
    results_3b = await test_model("llama3.2:3b", SAMPLE_CHUNKS, runs=3)

    # Show comparison
    print(f"\n{'='*60}")
    print("COMPARISON SUMMARY")
    print(f"{'='*60}")

    models = [results_1b, results_3b]
    for result in models:
        model = result["model"]
        stats = result["stats"]
        print(f"\n{model}:")
        print(f"  Success: {stats['success_rate']}")
        if stats['avg_time']:
            print(f"  Avg: {stats['avg_time']:.2f}s, Min: {stats['min_time']:.2f}s, Max: {stats['max_time']:.2f}s")

        # Show sample questions from first successful run
        for run_result in result["runs"]:
            if run_result["success"] and run_result["questions"]:
                print(f"\n  Sample questions:")
                for i, q in enumerate(run_result["questions"][:3], 1):
                    print(f"    {i}. {q}")
                break

    # Save detailed results
    output = {
        "test_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "models_tested": ["llama3.2:1b", "llama3.2:3b"],
        "results": {
            "llama3.2:1b": results_1b,
            "llama3.2:3b": results_3b
        }
    }

    with open("model_comparison_results.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nOK Detailed results saved to: model_comparison_results.json")

if __name__ == "__main__":
    asyncio.run(main())
