#!/usr/bin/env python3
"""
Ollama Model Loader & Keep-Alive Script

Ensures the configured LLM model is loaded into Ollama memory before the AI service
starts accepting requests. Also provides a keep-alive mode to periodically ping the
model so it doesn't get unloaded due to inactivity.

Usage:
    python scripts/ensure_model_loaded.py              # Load once and exit
    python scripts/ensure_model_loaded.py --keep-alive # Load and keep pinging every 5 minutes
"""
import httpx
import time
import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path to import app settings
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config.settings import settings

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
MODEL = settings.OLLAMA_CHAT_MODEL
KEEP_ALIVE_INTERVAL = 300  # 5 minutes


def check_ollama_health():
    """Check if Ollama is running and responsive."""
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        return response.status_code == 200
    except Exception as e:
        print(f"ERROR: Ollama health check failed: {e}")
        return False


def is_model_loaded():
    """Check if the model is currently loaded in memory."""
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL}/api/ps", timeout=5.0)
        if response.status_code == 200:
            data = response.json()
            loaded_models = [m["name"] for m in data.get("models", [])]
            return MODEL in loaded_models
        return False
    except Exception as e:
        print(f"WARNING: Could not check loaded models: {e}")
        return False


def load_model():
    """Load the model into Ollama memory using /api/pull."""
    print(f"Loading model '{MODEL}' into Ollama memory...")
    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/pull",
            json={"name": MODEL},
            timeout=120.0  # Model loading can take time
        )

        if response.status_code == 200:
            print(f"OK: Model '{MODEL}' successfully loaded into memory")
            return True
        else:
            print(f"ERROR: Failed to load model. Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"ERROR: Error loading model: {e}")
        return False


def ping_model():
    """
    Send a lightweight request to the model to keep it alive in memory.
    Uses /api/generate with a trivial prompt.
    """
    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": MODEL,
                "prompt": "ping",
                "stream": False
            },
            timeout=30.0
        )

        if response.status_code == 200:
            return True
        else:
            print(f"WARNING: Ping failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"WARNING: Ping failed: {e}")
        return False


def ensure_model_loaded():
    """Main logic: ensure model is loaded."""
    print(f"\n{'='*60}")
    print(f"Ollama Model Loader")
    print(f"{'='*60}")
    print(f"Model: {MODEL}")
    print(f"Ollama URL: {OLLAMA_BASE_URL}")
    print(f"{'='*60}\n")

    # Step 1: Check Ollama health
    print("[1] Checking Ollama connectivity...")
    if not check_ollama_health():
        print("ERROR: Ollama is not running or not accessible!")
        print("   Please start Ollama and try again.")
        return False
    print("OK: Ollama is running\n")

    # Step 2: Check if model is already loaded
    print("[2] Checking if model is loaded in memory...")
    if is_model_loaded():
        print(f"OK: Model '{MODEL}' is already loaded\n")
        return True
    print(f"WARNING: Model '{MODEL}' is not loaded\n")

    # Step 3: Load the model
    print("[3] Loading model into memory...")
    if load_model():
        print()
        return True
    else:
        print("\nERROR: Failed to load model. AI service may experience timeouts.")
        return False


def keep_alive_loop():
    """Keep the model alive by pinging it periodically."""
    print(f"\nKeep-alive mode enabled (interval: {KEEP_ALIVE_INTERVAL}s)")
    print("   Press Ctrl+C to stop\n")

    while True:
        try:
            time.sleep(KEEP_ALIVE_INTERVAL)

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Pinging model to keep alive...")

            if not is_model_loaded():
                print("   WARNING: Model not loaded! Attempting to reload...")
                load_model()
            elif ping_model():
                print("   OK: Model is alive")
            else:
                print("   WARNING: Ping failed, will retry next interval")

        except KeyboardInterrupt:
            print("\n\nKeep-alive stopped")
            break
        except Exception as e:
            print(f"   ERROR: Error in keep-alive loop: {e}")
            time.sleep(10)  # Wait a bit before retrying


def main():
    parser = argparse.ArgumentParser(
        description="Ensure Ollama model is loaded and optionally keep it alive"
    )
    parser.add_argument(
        "--keep-alive",
        action="store_true",
        help="Keep pinging the model every 5 minutes to prevent unloading"
    )

    args = parser.parse_args()

    # Always ensure model is loaded first
    success = ensure_model_loaded()

    if not success:
        sys.exit(1)

    # If keep-alive mode requested, enter the loop
    if args.keep_alive:
        keep_alive_loop()
    else:
        print("OK: Model is ready. AI service can now start.")


if __name__ == "__main__":
    main()
