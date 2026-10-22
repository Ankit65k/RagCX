#!/usr/bin/env python3
"""
Test script to send a real chat message through the AI service
and measure response time.
"""
import asyncio
import time
import uuid
import json
import redis.asyncio as redis

from app.schemas.events import BusEvent
from datetime import datetime, timezone

# Configuration
REDIS_URL = "redis://localhost:6379/0"
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:1b"

async def test_chat():
    """Test chat functionality and measure response time."""
    print("=" * 60)
    print("Chat Test - Response Time Measurement")
    print("=" * 60)

    # Connect to Redis
    print(f"\n1. Connecting to Redis at {REDIS_URL}...")
    r = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    print("   OK: Connected to Redis")

    # Generate a test conversation ID
    conversation_id = str(uuid.uuid4())
    print(f"\n2. Test Conversation ID: {conversation_id}")

    # Send a simple test message
    question = "Hello, how are you?"
    print(f"\n3. Sending chat request...")
    print(f"   Question: '{question}'")
    print(f"   Conversation: {conversation_id}")

    # Create chat event
    event_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())[:8]
    correlation_id = str(uuid.uuid4())

    chat_event = BusEvent(
        eventId=event_id,
        eventType="CHAT_REQUEST",
        version="1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        correlationId=correlation_id,
        requestId=request_id,
        producer="test-client",
        payload={
            "chatSessionId": conversation_id,
            "prompt": question,
            "documentIds": []
        },
        metadata={
            "userId": "test-user",
            "top_k": 5
        }
    )

    # Publish to Redis
    event_json = chat_event.model_dump_json()
    print(f"\n4. Publishing to Redis channel 'chat:jobs'...")
    print(f"   Event ID: {event_id}")
    print(f"   Request ID: {request_id}")

    # Start timing
    start_time = time.perf_counter()

    await r.publish("chat:jobs", event_json)
    print("   OK: Event published")

    # Wait for response with timeout
    print("\n5. Waiting for response...")
    response_received = False
    timeout = 60  # 60 second timeout

    # Subscribe to response channel
    pubsub = r.pubsub()
    await pubsub.subscribe("chat:jobs")

    print(f"   Timeout: {timeout} seconds")

    async def check_for_response():
        nonlocal response_received
        while time.perf_counter() - start_time < timeout:
            message = await pubsub.get_message()
            if message:
                data = message.get("data")
                if data:
                    try:
                        event = json.loads(data)
                        if event.get("eventType") == "CHAT_RESPONSE":
                            return event
                    except:
                        pass
            await asyncio.sleep(0.5)
        return None

    response_event = await check_for_response()

    end_time = time.perf_counter()
    elapsed_ms = (end_time - start_time) * 1000

    if response_event:
        response_received = True
        print("\n" + "=" * 60)
        print("RESPONSE RECEIVED")
        print("=" * 60)
        print(f"Response Time: {elapsed_ms:.1f} ms")
        print(f"  - Start: {time.strftime('%H:%M:%S', time.localtime(start_time))}")
        print(f"  - End:   {time.strftime('%H:%M:%S', time.localtime(end_time))}")

        payload = response_event.get("payload", {})
        print(f"\nAnswer: {payload.get('answer', 'N/A')[:200]}...")
        print(f"Confidence: {payload.get('confidence', 'N/A')}")
        print(f"Model: {payload.get('model', 'N/A')}")
        print(f"Execution Time: {payload.get('executionTime', 'N/A')} ms")
        print(f"\nSOURCES: {json.dumps(payload.get('sources', []), indent=2)}")
    else:
        print("\n" + "=" * 60)
        print("TIMEOUT - No response received within 60 seconds")
        print("=" * 60)

    await pubsub.unsubscribe()
    await r.close()

    return response_received

if __name__ == "__main__":
    result = asyncio.run(test_chat())

    print("\n" + "=" * 60)
    if result:
        print("TEST PASSED - Chat response received successfully")
    else:
        print("TEST FAILED - No response received")
    print("=" * 60)
