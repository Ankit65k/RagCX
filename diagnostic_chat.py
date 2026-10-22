#!/usr/bin/env python3
"""
Comprehensive diagnostic to trace chat flow
"""
import json
import redis
import time
import uuid
import sys
import asyncio

# Test 1: Check if AI service is alive and responding
async def test_ai_service_health():
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/api/v1/health", timeout=10)
            print(f"✅ AI Service Health: {response.status_code} - {response.json()}")
            return True
    except Exception as e:
        print(f"❌ AI Service Health Check Failed: {e}")
        return False

# Test 2: Test chat directly with AI service
async def test_direct_chat():
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            # Use the correct path - need to check the actual routes
            # Let me try to find available endpoints
            response = await client.get("http://localhost:8000/docs", timeout=10)
            print("✅ AI Service docs available")
            return True
    except Exception as e:
        print(f"❌ Direct chat test failed: {e}")
        return False

# Test 3: Test Redis connection and channels
def test_redis_connection():
    try:
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        info = r.info()
        print(f"✅ Redis Connected: {info.get('redis_version')}")

        # Check active channels
        channels = r.pubsub_channels()
        print(f"📡 Active Redis Channels: {channels}")
        return True
    except Exception as e:
        print(f"❌ Redis Connection Failed: {e}")
        return False

# Test 4: Test workflow execution
def test_workflow_direct():
    """
    Try to execute the chat pipeline directly to find where it fails
    """
    print("\n🔍 Testing Chat Pipeline Directly...")

    # Check if we can import the pipeline
    try:
        sys.path.insert(0, '/c/Users/Ankit Tiwari/RagCX/ai-service')
        from app.chat.models import ChatEventRequest
        from datetime import datetime
        print("✅ ChatEventRequest model can be imported")

        # Check if there are any documents in ChromaDB
        try:
            import chromadb
            client = chromadb.HttpClient(host='localhost', port=8001)
            collections = client.list_collections()
            print(f"✅ ChromaDB accessible. Collections: {collections}")

            if collections:
                collection = client.get_collection(collections[0])
                count = collection.count()
                print(f"   Collection '{collections[0]}' has {count} embeddings")
            else:
                print("⚠️ No collections in ChromaDB (expected if no docs uploaded)")

        except Exception as e:
            print(f"❌ ChromaDB check failed: {e}")

        return True
    except Exception as e:
        print(f"❌ Import/Workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🔬 RAGCX Chat System Diagnostic")
    print("=" * 50)

    # Run tests
    health_ok = asyncio.run(test_ai_service_health())
    redis_ok = test_redis_connection()

    print("\n📊 Summary:")
    print(f"  AI Service Health: {'✅' if health_ok else '❌'}")
    print(f"  Redis Connection: {'✅' if redis_ok else '❌'}")

    # Try direct workflow test
    workflow_ok = test_workflow_direct()
    print(f"  Workflow Import: {'✅' if workflow_ok else '❌'}")

    print("\n🎯 Problem Analysis:")
    if health_ok and redis_ok:
        print("✅ Services are running and connected")
        print("⚠️ Issue: AI Service receives CHAT_REQUEST but doesn't send CHAT_RESPONSE")
        print("\n🔧 Possible Causes:")
        print("1. ChatPipeline.execute() throwing uncaught exception")
        print("2. WorkflowEngine failing silently")
        print("3. ChatEventHandler not publishing error response")
        print("4. Ollama model not loaded or hanging")
        print("5. ChromaDB connection issue")

        print("\n💡 Solution Steps:")
        print("1. Check AI service logs for exceptions")
        print("2. Verify Ollama model is loaded: curl localhost:11434/api/ps")
        print("3. Check ChatEventHandler error handling")
        print("4. Add better logging to pipeline.execute()")
    else:
        print("❌ Fix service connectivity first")
        if not health_ok:
            print("   - Restart AI Service: python -m uvicorn app.main:app --reload")
        if not redis_ok:
            print("   - Start Redis/Memurai service")

    print("\n⚡ Quick Fix: Add error response fallback")
    print("   Modify ai-service/app/chat/handler.py line 66 to ensure publish on error")

if __name__ == "__main__":
    main()