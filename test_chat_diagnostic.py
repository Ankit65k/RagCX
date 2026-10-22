"""
Comprehensive diagnostic test to identify the exact cause of chat errors
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-service'))

async def main():
    print("=== CHAT ERROR DIAGNOSTIC ===\n")

    # Test 1: Check Ollama is accessible
    print("1. Testing Ollama connection...")
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags", timeout=5.0)
            if response.status_code == 200:
                models = response.json().get("models", [])
                print("   [OK] Ollama is running")
                print(f"   Models available: {[m['name'] for m in models]}")

                # Check if the configured model is loaded
                ps_response = await client.get("http://localhost:11434/api/ps", timeout=5.0)
                loaded = ps_response.json().get("models", [])
                if loaded:
                    print(f"   Loaded in memory: {[m['name'] for m in loaded]}")
                else:
                    print("   [WARN] No models loaded in memory - this will cause timeouts!")
            else:
                print(f"   [ERROR] Ollama returned status {response.status_code}")
    except Exception as e:
        print(f"   [ERROR] Cannot connect to Ollama: {e}")
        return

    # Test 2: Check ChromaDB
    print("\n2. Testing ChromaDB...")
    try:
        import chromadb
        from chromadb.config import Settings
        client = chromadb.PersistentClient(
            path=os.path.join(os.path.dirname(__file__), 'ai-service', 'data', 'chroma'),
            settings=Settings(anonymized_telemetry=False)
        )
        collection = client.get_collection('ragcx_documents')
        count = collection.count()
        print("   [OK] ChromaDB accessible")
        print(f"   Documents in collection: {count}")
        if count == 0:
            print("   [WARN] Vector store is empty")
    except Exception as e:
        print(f"   [ERROR] ChromaDB error: {e}")
        return

    # Test 3: Check Redis
    print("\n3. Testing Redis...")
    try:
        import redis.asyncio as redis
        r = await redis.from_url("redis://localhost:6379/0")
        await r.ping()
        print("   [OK] Redis is accessible")
        await r.aclose()
    except Exception as e:
        print(f"   [ERROR] Redis error: {e}")
        return

    # Test 4: Test the full chat pipeline with a simple question
    print("\n4. Testing chat pipeline with simple question...")
    try:
        from app.core.dependencies.container import Container
        container = Container()

        # Get the chat handler
        chat_handler = container.chat_handler()

        # Create test event
        from app.schemas.events import BusEvent
        from datetime import datetime

        event = BusEvent(
            eventId="diagnostic-test-001",
            eventType="CHAT_REQUEST",
            version="1.0",
            timestamp=datetime.utcnow(),
            correlationId="diag-corr-001",
            requestId="diag-req-001",
            payload={
                "chatSessionId": "diag-session-001",
                "prompt": "Hello, this is a test question.",
                "documentIds": []
            },
            metadata={"userId": "diag-user"}
        )

        print("   Sending test chat request...")
        await chat_handler.handle_event(event)

        # Wait a moment for response to be published
        await asyncio.sleep(2)

        print("   [OK] Chat pipeline executed (check Redis for response)")

    except Exception as e:
        print(f"   [ERROR] Chat pipeline error: {type(e).__name__}: {e}")
        import traceback
        print("\n   Full traceback:")
        traceback.print_exc()

        # Analyze the error
        error_msg = str(e).lower()
        if "timeout" in error_msg:
            print("\n   DIAGNOSIS: Timeout error - Model not loaded in Ollama")
            print("   FIX: Run 'cd ai-service && python scripts/ensure_model_loaded.py --keep-alive'")
        elif "connection" in error_msg or "refused" in error_msg:
            print("\n   DIAGNOSIS: Connection error - Service not running")
            print("   FIX: Ensure Ollama/Redis are running")
        elif "not found" in error_msg or "empty" in error_msg:
            print("\n   DIAGNOSIS: No documents found")
            print("   FIX: Upload a document first")
        else:
            print("\n   DIAGNOSIS: Unexpected error - see traceback above")

    print("\n=== DIAGNOSTIC COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(main())
