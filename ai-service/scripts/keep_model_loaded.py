"""
Keep-Alive Script for Ollama Model
===================================
Prevents the LLM model from being unloaded during idle periods.

Run this in a separate terminal BEFORE starting the AI service:
    cd ai-service
    python scripts/keep_model_loaded.py

Or with custom interval (default: 5 minutes):
    python scripts/keep_model_loaded.py --interval 300

The script will:
1. Load the model if not already loaded
2. Ping Ollama every N seconds to keep it active
3. Exit on keyboard interrupt (Ctrl+C)
"""
import asyncio
import argparse
import httpx
import sys
import signal
from datetime import datetime

# Configuration
DEFAULT_INTERVAL = 300  # 5 minutes (Ollama unloads after ~10-15 min idle)
OLLAMA_URL = "http://localhost:11434"
MODEL_NAME = "llama3.2:1b"


async def check_model_loaded() -> bool:
    """Check if the model is currently loaded in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/ps")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                return any(m.get("name") == MODEL_NAME for m in models)
            return False
    except Exception:
        return False


async def load_model() -> bool:
    """Trigger Ollama to load the model."""
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 min timeout for cold load
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": "Ready",
                    "stream": False,
                    "options": {"num_predict": 1}
                }
            )
            return resp.status_code == 200
    except Exception as e:
        print(f"Error loading model: {e}")
        return False


async def ping_model() -> bool:
    """Send a minimal ping to keep model active."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": ".",
                    "stream": False,
                    "options": {"num_predict": 1}
                }
            )
            return resp.status_code == 200
    except Exception:
        return False


async def keep_alive(interval: int):
    """Main keep-alive loop."""
    print("=" * 70)
    print("OLLAMA MODEL KEEP-ALIVE")
    print("=" * 70)
    print(f"Model: {MODEL_NAME}")
    print(f"Ping interval: {interval} seconds ({interval // 60} minutes)")
    print(f"Ollama URL: {OLLAMA_URL}")
    print("=" * 70)
    print("Press Ctrl+C to stop...")
    print()

    loaded = await check_model_loaded()
    if not loaded:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Model not loaded. Loading...")
        if await load_model():
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Model loaded successfully!")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to load model. Will retry on next ping.")
    else:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Model is already loaded.")

    print()
    consecutive_failures = 0

    try:
        while True:
            await asyncio.sleep(interval)
            success = await ping_model()
            now = datetime.now().strftime('%H:%M:%S')

            if success:
                print(f"[{now}] ✓ Ping successful - model is active")
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                print(f"[{now}] ✗ Ping failed (attempt {consecutive_failures})")

                # Try to reload if multiple failures
                if consecutive_failures >= 2:
                    print(f"[{now}] Attempting to reload model...")
                    if await load_model():
                        print(f"[{now}] Model reloaded successfully!")
                        consecutive_failures = 0
                    else:
                        print(f"[{now}] Failed to reload model")

    except asyncio.CancelledError:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Keep-alive stopped.")
        return


def main():
    parser = argparse.ArgumentParser(
        description="Keep Ollama model loaded to prevent cold starts"
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=DEFAULT_INTERVAL,
        help=f"Ping interval in seconds (default: {DEFAULT_INTERVAL})"
    )
    args = parser.parse_args()

    # Handle Ctrl+C gracefully
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(keep_alive(args.interval))
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        loop.close()


if __name__ == "__main__":
    main()