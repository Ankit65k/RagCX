"""
Test script to verify JSON truncation fixes with 5 questions about the resume.
"""
import asyncio
import httpx
import time
import json

BACKEND_URL = "http://localhost:4000/api/v1"
TEST_SESSION_ID = "test-session-001"


async def get_auth_token(client: httpx.AsyncClient) -> str:
    """Login and return auth token."""
    response = await client.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": "admin12@gmail.com", "password": "Admin@12345678"}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["tokens"]["accessToken"]


async def send_chat_message(client: httpx.AsyncClient, token: str, question: str) -> dict:
    """Send a chat message and return the result with timing."""
    start_time = time.time()

    try:
        response = await client.post(
            f"{BACKEND_URL}/chat/sessions/{TEST_SESSION_ID}/messages",
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
    print("Testing 5 questions about the resume to verify JSON truncation fixes")
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

        for i, question in enumerate(questions, 2):
            print(f"\n[Question {i-1}/5] {question}")
            print("-" * 80)

            result = await send_chat_message(client, token, question)

            if result["status"] == "success":
                print(f"[OK] Time: {result['elapsed_ms']:.0f}ms")
                answer_preview = result["answer"][:300]
                if len(result["answer"]) > 300:
                    answer_preview += "..."
                print(f"Answer: {answer_preview}")
                print(f"Confidence: {result['confidence']}")
                print(f"Sources: {result['sources']}")
            else:
                print(f"[ERROR] Time: {result['elapsed_ms']:.0f}ms")
                print(f"Error: {result['error']}")

            # Small delay between questions
            await asyncio.sleep(1)

    print("\n" + "=" * 80)
    print("Test complete. Check ai-service logs for any errors.")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
