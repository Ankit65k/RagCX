#!/usr/bin/env python3
"""
Diagnostic test to check chat flow and identify where it fails.
"""
import json
import redis
import time
import uuid
import sys
from datetime import datetime

# Fix encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Generate a test request
request_id = str(uuid.uuid4())
chat_session_id = f"test-{int(time.time())}"

# Create CHAT_REQUEST event
event = {
    "eventType": "CHAT_REQUEST",
    "eventId": str(uuid.uuid4()),
    "requestId": request_id,
    "correlationId": request_id,
    "version": "1.0",
    "timestamp": time.time(),  # Keep as float for now - will be converted
    "payload": {
        "chatSessionId": chat_session_id,
        "prompt": "Hello, test message",
        "documentIds": []
    },
    "metadata": {
        "userId": "test-user"
    }
}

print(f"Publishing CHAT_REQUEST to Redis...")
print(f"Request ID: {request_id}")
print(f"Session ID: {chat_session_id}")

# Convert timestamp to ISO string before publishing
event["timestamp"] = datetime.fromtimestamp(event["timestamp"]).isoformat()
print(f"Event: {json.dumps(event, indent=2)}")

# Subscribe to response channel first
pubsub = r.pubsub()
pubsub.subscribe('chat:jobs')

# Publish request
r.publish('chat:jobs', json.dumps(event))
print(f"Published to 'chat:jobs' channel")

# Wait for response
print(f"\nWaiting for CHAT_RESPONSE (timeout: 60s)...")
start_time = time.time()
timeout = 60

for message in pubsub.listen():
    if message['type'] == 'message':
        elapsed = time.time() - start_time

        try:
            data = json.loads(message['data'])
            # Only accept CHAT_RESPONSE events (not our own echo)
            if data.get('eventType') != 'CHAT_RESPONSE':
                print(f"  (Ignored non-response message: {data.get('eventType')})")
                continue

            # Check if it's our response
            if data.get('requestId') == request_id:
                print(f"\n=== CHAT_RESPONSE received after {elapsed:.2f}s ===")
                print(f"Answer: {data.get('payload', {}).get('answer', 'N/A')}")
                print(f"Confidence: {data.get('payload', {}).get('confidence', 'N/A')}")
                print(f"Execution Time: {data.get('payload', {}).get('executionTime', 'N/A')}ms")
                print(f"Full response: {json.dumps(data, indent=2)}")
                break
        except json.JSONDecodeError:
            print(f"Could not parse message: {message['data']}")

    # Check timeout
    if time.time() - start_time > timeout:
        print(f"\nTIMEOUT: No response after {timeout}s")
        break

pubsub.close()
