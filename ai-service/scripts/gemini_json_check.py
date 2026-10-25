#!/usr/bin/env python3
"""
Test script for Gemini JSON chat calls with validation.

Makes 5 sequential chat(format="json") calls through GeminiProvider,
validates responses with LLMStructuredResponse, and reports statistics.

Run from ai-service:
    python -m scripts.gemini_json_check
"""
import asyncio
import time

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.models.factory import create_llm_provider
from app.rag.models import LLMStructuredResponse


# Grounded context and question for testing
CONTEXT = """Document ID: doc-123, Page: 5, Chunk: chunk-abc
The RagCX system uses a hybrid retrieval approach combining dense embeddings
with sparse keyword matching to improve search relevance."""

QUESTION = "What retrieval approach does RagCX use?"


async def run_json_check() -> None:
    """Run 5 sequential JSON chat calls and validate responses."""

    # Print provider info once at start (never the API key)
    print(f"Provider: {settings.LLM_PROVIDER}")

    # Build the prompt from the schema
    prompt = f"""Based on the following context, answer the question as a JSON object.

Context:
{CONTEXT}

Question: {QUESTION}

Return ONLY a JSON object with exactly these keys:
- "answer": string - the answer to the question based only on the context
- "confidence": one of "LOW", "MEDIUM", "HIGH" (uppercase) - your confidence in the answer
- "citations": list of objects with these keys:
  - "documentId": string - the document ID from the context
  - "page": integer - the page number from the context
  - "chunkId": string - the chunk ID from the context

Return only valid JSON, no additional text."""

    # Create an HTTP client for the provider factory
    async with httpx.AsyncClient() as client:
        # Get provider from factory (will use real settings)
        provider = create_llm_provider(client)
        print(f"Provider class: {type(provider).__name__}\n")

        results = []

        for i in range(1, 6):
            start_time = time.perf_counter()

            try:
                # Make the chat call with JSON format
                response_text = await provider.chat(
                    messages=[{"role": "user", "content": prompt}],
                    format="json"
                )

                elapsed = time.perf_counter() - start_time

                # Validate with LLMStructuredResponse
                try:
                    LLMStructuredResponse.model_validate_json(response_text)
                    valid = "valid"
                    exception = None
                except ValidationError as e:
                    valid = "invalid"
                    exception = type(e).__name__
                except Exception as e:
                    valid = "invalid"
                    exception = type(e).__name__

                results.append({
                    "call": i,
                    "elapsed": elapsed,
                    "valid": valid,
                    "exception": exception
                })

                # Print call summary (never the prompt or response text)
                print(f"call {i}: {elapsed:.3f}s, {valid}, exception={exception}")

            except Exception as e:
                elapsed = time.perf_counter() - start_time
                results.append({
                    "call": i,
                    "elapsed": elapsed,
                    "valid": "error",
                    "exception": type(e).__name__
                })
                print(f"call {i}: {elapsed:.3f}s, error, exception={type(e).__name__}")

            # Small delay between calls
            if i < 5:
                await asyncio.sleep(0.5)

    # Calculate summary statistics
    elapsed_times = [r["elapsed"] for r in results]
    valid_count = sum(1 for r in results if r["valid"] == "valid")
    invalid_count = sum(1 for r in results if r["valid"] == "invalid")
    error_count = sum(1 for r in results if r["valid"] == "error")

    min_elapsed = min(elapsed_times)
    max_elapsed = max(elapsed_times)
    avg_elapsed = sum(elapsed_times) / len(elapsed_times)
    over_20s = sum(1 for t in elapsed_times if t > 20.0)

    # Print summary
    print(f"\nSummary: {valid_count} valid, {invalid_count} invalid, {error_count} errors")
    print(f"Elapsed: min={min_elapsed:.3f}s, max={max_elapsed:.3f}s, avg={avg_elapsed:.3f}s")
    print(f"Calls over 20s: {over_20s}")


def main() -> None:
    """Entry point."""
    asyncio.run(run_json_check())


if __name__ == "__main__":
    main()
