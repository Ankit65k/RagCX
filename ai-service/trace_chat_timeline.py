#!/usr/bin/env python3
"""
Comprehensive test to trace chat request timeline.
Sends a request through the full backend → Redis → AI service → Redis → backend path.
"""
import asyncio
import time
import uuid
import json
import redis.asyncio as redis
import httpx

from app.schemas.events import BusEvent
from datetime import datetime, timezone

# Configuration
REDIS_URL = "redis://localhost:6379/0"
CONVERSATION_ID = "test-trace-001"
QUESTION = "work experience of ankit tiwari"

async def test_with_timeline():
    print("=" * 70)
    print("CHAT TIMELINE TRACE TEST")
    print("=" * 70)
    print(f"Question: {QUESTION}")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # Connect to Redis
    print("[1] Connecting to Redis...")
    r = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    print("    [OK] Connected")
    print()

    # Create unique request ID
    request_id = f"trace-{int(time.time()*1000)}"
    correlation_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())

    print(f"[2] Request Details:")
    print(f"    Request ID: {request_id}")
    print(f"    Correlation ID: {correlation_id}")
    print(f"    Event ID: {event_id}")
    print()

    # Create chat event
    start_publish = time.perf_counter()
    chat_event = BusEvent(
        eventId=event_id,
        eventType="CHAT_REQUEST",
        version="1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        correlationId=correlation_id,
        requestId=request_id,
        producer="test-client",
        payload={
            "chatSessionId": CONVERSATION_ID,
            "prompt": QUESTION,
            "documentIds": []  # Query all documents
        },
        metadata={
            "userId": "test-user",
            "top_k": 5,
            "test": "timeline-trace"
        }
    )

    # Publish to Redis
    print("[3] Publishing CHAT_REQUEST to Redis channel 'chat:jobs'...")
    event_json = chat_event.model_dump_json()
    await r.publish("chat:jobs", event_json)
    end_publish = time.perf_counter()
    publish_time_ms = (end_publish - start_publish) * 1000

    print(f"    [OK] Published in {publish_time_ms:.1f}ms")
    print(f"    Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print()

    # Subscribe to response channel
    print("[4] Waiting for CHAT_RESPONSE...")
    print(f"    Timeout: 60 seconds")
    print()

    pubsub = r.pubsub()
    await pubsub.subscribe("chat:jobs")

    response_received = False
    start_wait = time.perf_counter()
    timeout_seconds = 60
    last_message_time = start_wait
    messages_checked = 0

    try:
        while time.perf_counter() - start_wait < timeout_seconds:
            message = await pubsub.get_message(timeout=0.5)
            messages_checked += 1

            if message and message.get("data"):
                last_message_time = time.perf_counter()
                try:
                    event = json.loads(message["data"])
                    event_type = event.get("eventType", event.get("type"))

                    # Only look for our response
                    if event.get("requestId") == request_id:
                        if event_type == "CHAT_RESPONSE":
                            end_wait = time.perf_counter()
                            total_time_ms = (end_wait - start_publish) * 1000

                            print("=" * 70)
                            print("RESPONSE RECEIVED!")
                            print("=" * 70)
                            print(f"\nTotal Time: {total_time_ms:.1f} ms ({total_time_ms/1000:.1f} seconds)")
                            print(f"Messages checked: {messages_checked}")

                            payload = event.get("payload", {})
                            answer = payload.get("answer", "N/A")
                            confidence = payload.get("confidence", "N/A")
                            execution_time = payload.get("executionTimeMs", payload.get("executionTime", 0))
                            sources = payload.get("sources", [])
                            model = payload.get("model", "N/A")

                            print(f"\n[Response Details]")
                            print(f"  Answer: {answer[:150]}...")
                            print(f"  Confidence: {confidence}")
                            print(f"  Execution Time (from payload): {execution_time:.1f} ms")
                            print(f"  Model: {model}")
                            print(f"  Sources: {len(sources)}")
                            if sources:
                                print(f"  Source Details: {json.dumps(sources, indent=2)}")
                            print()

                            response_received = True
                            break
                        elif event_type == "CHAT_ERROR":
                            print(f"    [WARN] Error response received: {event}")
                            break

                except json.JSONDecodeError:
                    pass

            # Progress indicator every 5 seconds
            elapsed = time.perf_counter() - start_wait
            if int(elapsed) % 10 == 0 and int(elapsed) > 0:
                print(f"    Still waiting... {int(elapsed)}s elapsed, checked {messages_checked} messages")

    except Exception as e:
        print(f"Error: {e}")

    end_total = time.perf_counter()
    total_time_ms = (end_total - start_publish) * 1000

    if not response_received:
        print("=" * 70)
        print("TIMEOUT - No response received")
        print("=" * 70)
        print(f"Waited: {(end_total - start_wait)*1000:.1f} ms")
        print(f"Messages checked: {messages_checked}")

    await pubsub.unsubscribe()
    await r.aclose()

    print("\n" + "=" * 70)
    print("TIMELINE SUMMARY")
    print("=" * 70)
    print(f"Publish to Redis:     {publish_time_ms:.1f} ms")
    print(f"Wait for response:    {(end_total - start_publish - publish_time_ms):.1f} ms")
    print(f"TOTAL:                {total_time_ms:.1f} ms ({total_time_ms/1000:.1f}s)")
    print("=" * 70)

    return response_received

if __name__ == "__main__":
    result = asyncio.run(test_with_timeline())
    print(f"\nTest {'PASSED' if result else 'FAILED'}")