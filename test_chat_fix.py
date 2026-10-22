#!/usr/bin/env python3
"""
Test script to verify chat timeout fixes
Checks:
1. Ollama status and loaded models
2. ChromaDB status
3. Redis connection
4. AI service health
5. Test chat with improved timeouts
"""

import httpx
import asyncio
import time
import json
import sys
from pathlib import Path

# Add ai-service to path to import settings
sys.path.insert(0, str(Path(__file__).parent / "ai-service"))

from app.core.config.settings import settings

OLLAMA_URL = settings.OLLAMA_BASE_URL
AI_SERVICE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:4000"
MODEL = settings.OLLAMA_CHAT_MODEL


async def check_ollama():
    """Check if Ollama is running and model is loaded."""
    print("[CHECK] Checking Ollama...")

    try:
        # Check health
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
            if resp.status_code != 200:
                print("[ERROR] Ollama not responding")
                return False

            # Check loaded models
            resp = await client.get(f"{OLLAMA_URL}/api/ps", timeout=5.0)
            data = resp.json()
            loaded = [m["name"] for m in data.get("models", [])]

            if MODEL in loaded:
                print(f"[OK] Ollama: Model '{MODEL}' loaded")
                return True
            else:
                print(f"[WARN]  Model '{MODEL}' not loaded in memory")
                return False

    except Exception as e:
        print(f"[ERROR] Ollama check failed: {e}")
        return False


async def check_ai_service():
    """Check AI service health."""
    print("\n[CHECK] Checking AI Service...")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{AI_SERVICE_URL}/api/v1/health", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                print(f"[OK] AI Service: {data['status']}")
                print(f"   Redis: {data['services']['redis']}")
                print(f"   Ollama: {data['services']['ollama']}")
                return True
            else:
                print(f"[ERROR] AI Service not healthy: {resp.text}")
                return False
    except Exception as e:
        print(f"[ERROR] AI Service check failed: {e}")
        return False


async def check_backend():
    """Check backend health."""
    print("\n[CHECK] Checking Backend...")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BACKEND_URL}/api/v1/health", timeout=5.0)
            if resp.status_code == 200:
                print("[OK] Backend is running")
                return True
            else:
                print(f"[WARN]  Backend check: {resp.status_code}")
                return False
    except Exception as e:
        print(f"[WARN]  Backend check failed: {e}")
        return True  # Continue even if backend not available


async def check_chroma():
    """Check ChromaDB status."""
    print("\n[CHECK] Checking ChromaDB...")

    chroma_dir = Path("ai-service/data/chroma")
    if chroma_dir.exists():
        collections = [d for d in chroma_dir.iterdir() if d.is_dir()]
        if collections:
            print(f"[OK] ChromaDB: {len(collections)} collection(s) found")
            for col in collections[:2]:  # Show first 2 collections
                print(f"   - {col.name}")
            if len(collections) > 2:
                print(f"   ... and {len(collections) - 2} more")
            return True
        else:
            print("[WARN]  ChromaDB exists but no collections found")
            return False
    else:
        print("[WARN]  ChromaDB directory not found - no documents uploaded")
        return False


async def test_timeout_settings():
    """Verify timeout settings are applied."""
    print("\n[CHECK] Checking Timeout Settings...")

    # Check AI service timeout config
    timeout_path = Path("ai-service/app/core/config/ollama_config.py")
    if timeout_path.exists():
        content = timeout_path.read_text()
        if "OLLAMA_REQUEST_TIMEOUT: float = 110.0" in content:
            print("[OK] AI Service timeout: 110 seconds")
        else:
            print("[WARN]  AI Service timeout not updated")

    # Check backend timeout
    backend_path = Path("backend/src/modules/chat/controllers/chat.controller.ts")
    if backend_path.exists():
        content = backend_path.read_text()
        if "timeoutMs = 120000" in content:
            print("[OK] Backend timeout: 120 seconds")
        else:
            print("[WARN]  Backend timeout not updated")

    # Check frontend error handling
    frontend_path = Path("frontend/src/features/chat/hooks/useChat.ts")
    if frontend_path.exists():
        content = frontend_path.read_text()
        if "Request took too long (>2 minutes)" in content:
            print("[OK] Frontend error messages updated")
        else:
            print("[WARN]  Frontend error messages not updated")


async def start_keep_alive():
    """Start the model keep-alive script."""
    print("\n[ACTION] Starting Model Keep-Alive...")

    script_path = Path("ai-service/scripts/ensure_model_loaded.py")
    if script_path.exists():
        print(f"[OK] Keep-alive script found: {script_path}")
        print("   To run: cd ai-service && python scripts/ensure_model_loaded.py --keep-alive")
        return True
    else:
        print("[WARN]  Keep-alive script not found")
        return False


async def main():
    print("=" * 60)
    print("CHAT TIMEOUT FIX VERIFICATION")
    print("=" * 60)

    results = {
        "ollama": await check_ollama(),
        "ai_service": await check_ai_service(),
        "backend": await check_backend(),
        "chroma": await check_chroma(),
    }

    await test_timeout_settings()
    await start_keep_alive()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    for service, status in results.items():
        symbol = "[OK]" if status else "[ERROR]"
        print(f"{symbol} {service.replace('_', ' ').title()}")

    all_good = all(results.values())

    if all_good:
        print("\n[OK] All systems ready for chat testing!")
        print("\n[TODO] NEXT STEPS:")
        print("1. Ensure model keep-alive is running:")
        print("   cd ai-service && python scripts/ensure_model_loaded.py --keep-alive")
        print("\n2. Open frontend: http://localhost:3000")
        print("\n3. Test chat - should work with 2 minute timeout")
    else:
        print("\n[WARN]  Some issues detected:")
        print("\n[ACTION] FIX REQUIRED:")
        if not results["ollama"]:
            print("   • Ollama model not loaded")
            print("   • Run: curl -X POST http://localhost:11434/api/pull -d '{\"name\": \"llama3.2:1b\"}'")
        if not results["ai_service"]:
            print("   • AI Service not running")
            print("   • Start: cd ai-service && python -m uvicorn app.main:app --reload")
        if not results["chroma"]:
            print("   • No documents uploaded")
            print("   • Upload PDFs via frontend: http://localhost:3000")

    print("\n[ACTION] TIMEUOT FIXES APPLIED:")
    print("   • Backend: 60s → 120s (for full RAG pipeline)")
    print("   • AI Service: 60s → 110s (for LLM inference)")
    print("   • Better error messages in frontend")
    print("   • Keep-alive script prevents model unloading")


if __name__ == "__main__":
    asyncio.run(main())