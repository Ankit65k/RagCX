"""
Test script to compare performance before/after context optimization.
Now with context size logging.
"""
import asyncio
import httpx
import time
import json

BACKEND_URL = "http://localhost:4000/api/v1"
TEST_SESSION_ID = "optimized-test-session-001"  # New session for clean comparison


async def get_auth_token(client: httpx.AsyncClient) -> str:
    """Login and return auth token."""
    response = await client.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": "admin12@gmail.com", "password": "Admin@12345678"}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["tokens"]["accessToken"]


async def send_chat_message(client: httpx.AsyncClient, token: str, question: str, session_id: str) -> dict:
    """Send a chat message and return the result with timing."""
    start_time = time.time()

    try:
        response = await client.post(
            f"{BACKEND_URL}/chat/sessions/{session_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"prompt": question}
        )
        elapsed_ms = (time.time() - start_time) * 1000

        if response.status_code == 200:
            data = response.json()
            payload = data.get("data", {}).get("payload", {})
            return {
                "question": question,
                "status": "success",
                "answer": payload.get("answer", "No answer"),
                "confidence": payload.get("confidence", "N/A"),
                "sources": len(payload.get("sources", [])),
                "elapsed_ms": elapsed_ms,
                "error": None
            }
        else:
            return {
                "question": question,
                "status": "error",
                "answer": None,
                "confidence": "N/A",
                "sources": 0,
                "elapsed_ms": elapsed_ms,
                "error": f"HTTP {response.status_code}: {response.text[:200]}"
            }
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        return {
            "question": question,
            "status": "error",
            "answer": None,
            "confidence": "N/A",
            "sources": 0,
            "elapsed_ms": elapsed_ms,
            "error": str(e)
        }


async def main():
    print("=" * 80)
    print("Testing 5 questions with OPTIMIZED context (top 3 chunks, ~800 chars each)")
    print("=" * 80)
    print()

    async with httpx.AsyncClient(timeout=90.0) as client:
        # Login to get token
        print("[1/5] Authenticating with backend...")
        try:
            token = await get_auth_token(client)
            print("[OK] Authentication successful")
        except Exception as e:
            print(f"[ERROR] Authentication failed: {e}")
            return

        questions = [
            "work experience of ankit tiwari",
            "what is ankit's educational background",
            "what programming languages does ankit know",
            "what are ankit's key projects",
            "what certifications does ankit have"
        ]

        results = []
        for i, question in enumerate(questions, 1):
            print(f"\n[Question {i}/5] {question}")
            print("-" * 80)

            result = await send_chat_message(client, token, question, TEST_SESSION_ID)

            if result["status"] == "success":
                print(f"[OK] Time: {result['elapsed_ms']:.0f}ms")
                answer_preview = result["answer"][:150]
                if len(result["answer"]) > 150:
                    answer_preview += "..."
                print(f"Answer: {answer_preview}")
                print(f"Confidence: {result['confidence']}")
                print(f"Sources: {result['sources']}")
            else:
                print(f"[ERROR] Time: {result['elapsed_ms']:.0f}ms")
                print(f"Error: {result['error']}")

            results.append(result)

            # Small delay between questions
            await asyncio.sleep(1)

    print("\n" + "=" * 80)
    print("OPTIMIZED TEST RESULTS SUMMARY")
    print("=" * 80)
    print("\nConfiguration: top 3 chunks, ~800 chars per chunk\n")

    for i, result in enumerate(results, 1):
        if result["status"] == "success":
            print(f"Q{i}: {result['question'][:40]}...")
            print(f"  Time: {result['elapsed_ms']:.0f}ms")
            print(f"  Confidence: {result['confidence']}")
            print(f"  Sources: {result['sources']}")
        else:
            print(f"Q{i}: {result['question'][:40]}...")
            print(f"  ERROR: {result['error']}")

    print("\nCheck ai-service logs for detailed context statistics.")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
