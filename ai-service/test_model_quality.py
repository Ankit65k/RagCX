"""
Step 2: Model Quality Evaluation
Test llama3.2:1b vs llama3.2:3b on:
- Suggested questions (4 questions)
- 3 in-PDF chat questions
- 1 out-of-PDF question
"""
import asyncio
import time
import json
import httpx
from typing import Dict, List, Any

# Sample ML document chunks (simulating PDF content)
ML_CHUNKS = [
    "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms that can learn from and make predictions on data. It uses statistical techniques to give computers the ability to learn without being explicitly programmed.",
    "There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data.",
    "Deep learning is a subset of machine learning that uses neural networks with multiple layers. These deep neural networks can automatically learn hierarchical representations of data, making them particularly effective for tasks like image recognition and natural language processing.",
    "Common applications of machine learning include recommendation systems, fraud detection, natural language processing, computer vision, and predictive analytics. Companies use ML to analyze customer behavior, optimize operations, and make data-driven decisions."
]

# In-PDF questions (should be answered from the chunks)
IN_PDF_QUESTIONS = [
    "What are the three main types of machine learning?",
    "What is deep learning and what are its applications?",
    "Name three common applications of machine learning."
]

# Out-of-PDF question (should NOT be in the chunks)
OUT_OF_PDF_QUESTION = "Who invented the first artificial neural network?"

async def test_model_suggestions(model_name: str) -> Dict[str, Any]:
    """Test suggested questions generation."""
    print(f"\n[{model_name}] Testing SUGGESTED QUESTIONS...")
    start = time.perf_counter()

    context = "\n\n".join([f"[Chunk {i+1}]\n{chunk}" for i, chunk in enumerate(ML_CHUNKS)])

    prompt = f"""You are a professional document analyst.
Your task is to analyze the provided document excerpts and generate questions that this document can ANSWER.

Generate exactly 4 suggested questions based ONLY on the context below.
Write one question per line. Do NOT number or bullet them.

--- CONTEXT ---
{context}

Generate 4 questions:"""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096,
                        "num_predict": 300,
                    }
                }
            )
            elapsed = time.perf_counter() - start

            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()

            # Parse one question per line
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            # Remove numbering/bullets
            questions = []
            for line in lines:
                # Remove leading numbers, dots, dashes, etc.
                cleaned = line.lstrip("0123456789.-) ")
                if cleaned and len(cleaned) > 10:  # Filter out very short lines
                    questions.append(cleaned)

            print(f"  Time: {elapsed:.2f}s")
            print(f"  Generated {len(questions)} questions:")
            for q in questions[:4]:
                print(f"    - {q[:70]}...")

            return {
                "model": model_name,
                "type": "suggestions",
                "elapsed": elapsed,
                "questions": questions[:4],
                "success": len(questions) >= 4
            }
    except Exception as e:
        print(f"  ERROR: {e}")
        return {"model": model_name, "type": "suggestions", "elapsed": 0, "questions": [], "success": False, "error": str(e)}

async def test_model_answer(model_name: str, question: str, is_in_pdf: bool) -> Dict[str, Any]:
    """Test answering a question."""
    question_type = "IN-PDF" if is_in_pdf else "OUT-OF-PDF"
    print(f"\n[{model_name}] Testing {question_type} QUESTION: '{question[:50]}...'")
    start = time.perf_counter()

    context = "\n\n".join([f"[Chunk {i+1}]\n{chunk}" for i, chunk in enumerate(ML_CHUNKS)])

    prompt = f"""You are a document analyst. Answer the question based ONLY on the provided document context.
If the answer is not in the document, respond: "This is not mentioned in the document."

Document context:
{context}

Question: {question}

Answer:"""

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096,
                        "num_predict": 300,
                    }
                }
            )
            elapsed = time.perf_counter() - start

            response.raise_for_status()
            data = response.json()
            answer = data.get("message", {}).get("content", "").strip()

            # Check correctness
            is_correct = False
            if is_in_pdf:
                # Should NOT say "not mentioned"
                is_correct = "not mentioned" not in answer.lower()
            else:
                # Should say "not mentioned" or similar
                is_correct = "not mentioned" in answer.lower() or "cannot find" in answer.lower() or "not in the document" in answer.lower()

            status = "CORRECT" if is_correct else "WRONG"
            print(f"  Time: {elapsed:.2f}s - {status}")
            print(f"  Answer: {answer[:100]}...")

            return {
                "model": model_name,
                "type": "answer",
                "question_type": question_type,
                "question": question,
                "answer": answer,
                "elapsed": elapsed,
                "is_correct": is_correct,
                "success": True
            }
    except Exception as e:
        print(f"  ERROR: {e}")
        return {"model": model_name, "type": "answer", "success": False, "error": str(e)}

async def warmup_model(model_name: str) -> float:
    """Warm up model with a simple call."""
    print(f"\n[{model_name}] Warming up model...")
    start = time.perf_counter()

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "What is 2+2?"}],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 512,
                        "num_predict": 10,
                    }
                }
            )
            elapsed = time.perf_counter() - start
            response.raise_for_status()
            print(f"  Warm-up time: {elapsed:.2f}s")
            return elapsed
    except Exception as e:
        print(f"  Warm-up failed: {e}")
        return 0

async def main():
    models = ["llama3.2:1b", "llama3.2:3b"]

    print("="*80)
    print("STEP 2: MODEL QUALITY EVALUATION")
    print("="*80)

    results = {}

    for model in models:
        print(f"\n{'='*80}")
        print(f"TESTING: {model}")
        print(f"{'='*80}")

        # Warm up
        warmup_time = await warmup_model(model)

        # Test suggested questions
        sugg_result = await test_model_suggestions(model)

        # Test in-PDF questions
        in_pdf_results = []
        for q in IN_PDF_QUESTIONS:
            result = await test_model_answer(model, q, is_in_pdf=True)
            in_pdf_results.append(result)

        # Test out-of-PDF question
        out_pdf_result = await test_model_answer(model, OUT_OF_PDF_QUESTION, is_in_pdf=False)

        results[model] = {
            "warmup_time": warmup_time,
            "suggestions": sugg_result,
            "in_pdf_answers": in_pdf_results,
            "out_pdf_answer": out_pdf_result
        }

    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY TABLE")
    print(f"{'='*80}\n")

    print("SUGGESTED QUESTIONS:")
    print("-" * 80)
    print(f"{'Model':<15} {'Time':<10} {'Success':<10} {'Questions'}")
    print("-" * 80)
    for model in models:
        r = results[model]["suggestions"]
        success = "YES" if r.get("success") else "NO"
        questions_str = " | ".join([q[:40] + "..." for q in r.get("questions", [])[:2]])
        print(f"{model:<15} {r.get('elapsed', 0):<10.2f} {success:<10} {questions_str}")

    print("\nIN-PDF QUESTIONS (should answer correctly):")
    print("-" * 80)
    print(f"{'Model':<15} {'Q1':<15} {'Q2':<15} {'Q3':<15} {'Avg Time'}")
    print("-" * 80)
    for model in models:
        answers = results[model]["in_pdf_answers"]
        correct = [1 if a.get("is_correct") else 0 for a in answers]
        times = [a.get("elapsed", 0) for a in answers if a.get("success")]
        avg_time = sum(times) / len(times) if times else 0
        q1_status = "OK" if correct[0] else "FAIL"
        q2_status = "OK" if correct[1] else "FAIL"
        q3_status = "OK" if correct[2] else "FAIL"
        print(f"{model:<15} {q1_status:<15} {q2_status:<15} {q3_status:<15} {avg_time:<.2f}s")

    print("\nOUT-OF-PDF QUESTION (should say 'not mentioned'):")
    print("-" * 80)
    print(f"{'Model':<15} {'Result':<15} {'Time':<10}")
    print("-" * 80)
    for model in models:
        r = results[model]["out_pdf_answer"]
        status = "OK" if r.get("is_correct") else "FAIL"
        print(f"{model:<15} {status:<15} {r.get('elapsed', 0):<10.2f}s")

    # Final recommendation
    print(f"\n{'='*80}")
    print("RECOMMENDATION")
    print(f"{'='*80}\n")

    # Calculate scores
    for model in models:
        in_pdf_correct = sum(1 for a in results[model]["in_pdf_answers"] if a.get("is_correct"))
        out_pdf_correct = 1 if results[model]["out_pdf_answer"].get("is_correct") else 0
        sugg_success = 1 if results[model]["suggestions"].get("success") else 0

        total_score = in_pdf_correct + out_pdf_correct + sugg_success
        avg_time = results[model]["suggestions"].get("elapsed", 0)

        print(f"{model}:")
        print(f"  In-PDF correctness: {in_pdf_correct}/3")
        print(f"  Out-of-PDF correctness: {out_pdf_correct}/1")
        print(f"  Suggestions generated: {sugg_success}/1")
        print(f"  Total score: {total_score}/5")
        print(f"  Avg suggestion time: {avg_time:.2f}s")
        print()

if __name__ == "__main__":
    asyncio.run(main())
