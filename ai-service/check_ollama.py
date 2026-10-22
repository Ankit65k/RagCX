#!/usr/bin/env python3
"""
Quick script to check Ollama status and load model if needed.
"""

import httpx
import asyncio
import sys

async def check_ollama():
    """Check if Ollama is running and model is loaded."""
    print("🔍 Checking Ollama status...")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if Ollama is running
            print("1. Checking Ollama API health...")
            try:
                resp = await client.get("http://localhost:11434/api/tags")
                if resp.status_code == 200:
                    print("   ✅ Ollama is running")
                    data = resp.json()
                    models = data.get("models", [])
                    if models:
                        print(f"   📋 Models available: {[m.get('name') for m in models]}")
                    else:
                        print("   ⚠️  No models listed (but API responds)")
                else:
                    print(f"   ❌ Ollama API error: {resp.status_code}")
                    return False
            except httpx.RequestError as e:
                print(f"   ❌ Cannot connect to Ollama: {e}")
                return False

            # Check if model is loaded in memory
            print("\n2. Checking if model is loaded in memory...")
            try:
                resp = await client.get("http://localhost:11434/api/ps")
                if resp.status_code == 200:
                    data = resp.json()
                    active_models = data.get("models", [])
                    if active_models:
                        print(f"   ✅ Model is loaded: {[m.get('name') for m in active_models]}")
                    else:
                        print("   ⚠️  Model is NOT loaded in memory (empty response from /api/ps)")
                        print("   This means chat requests will hang!")
                        return False
                else:
                    print(f"   ❌ Error checking model status: {resp.status_code}")
                    return False
            except httpx.RequestError as e:
                print(f"   ❌ Error checking model status: {e}")
                return False

            # Test simple chat request
            print("\n3. Testing simple chat request...")
            try:
                payload = {
                    "model": "llama3.2:1b",
                    "messages": [
                        {"role": "user", "content": "Say 'hello' if you're working"}
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 50
                    }
                }
                resp = await client.post(
                    "http://localhost:11434/api/chat",
                    json=payload,
                    timeout=15.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("message", {}).get("content", "")
                    print(f"   ✅ Chat test successful: {content[:50]}...")
                else:
                    print(f"   ❌ Chat test failed: {resp.status_code} - {resp.text}")
                    return False
            except httpx.TimeoutException:
                print("   ⚠️  Chat request timed out (model probably not loaded)")
                return False
            except httpx.RequestError as e:
                print(f"   ❌ Chat request error: {e}")
                return False

            return True

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

async def load_model():
    """Load the model into memory."""
    print("\n🔄 Attempting to load model...")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {"name": "llama3.2:1b"}
            resp = await client.post(
                "http://localhost:11434/api/pull",
                json=payload,
                timeout=60.0
            )

            if resp.status_code == 200:
                print("   ✅ Model load request sent")
                print("   ⏳ Model will load in ~30-60 seconds...")
                print("   📝 Check progress with: curl http://localhost:11434/api/ps")
                return True
            else:
                print(f"   ❌ Failed to load model: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        print(f"   ❌ Model load error: {e}")
        return False

async def main():
    """Main function."""
    print("=" * 50)
    print("Ollama Diagnostic Tool")
    print("=" * 50)

    # Step 1: Check status
    is_healthy = await check_ollama()

    if not is_healthy:
        print("\n⚠️ Ollama has issues. Want to load the model?")
        choice = input("Load llama3.2:1b model? (y/N): ").strip().lower()
        if choice == 'y':
            await load_model()
            print("\n✅ Model loading initiated. Wait 30-60 seconds then check again.")
        else:
            print("\n❌ Model not loaded. Chat will timeout.")
    else:
        print("\n✅ Ollama is ready for chat!")

    print("\n" + "=" * 50)
    print("Next steps:")
    print("1. If model wasn't loaded: Run the model loader script")
    print("2. Start AI service: python -m uvicorn app.main:app --reload")
    print("3. Test chat in frontend")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())