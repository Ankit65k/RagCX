#!/usr/bin/env python3
"""
Manual test to verify AI service is processing CHAT_REQUEST
"""
import json
import redis
import time
import uuid
import sys

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Check active subscriptions
print("Active Redis subscriptions (clients subscribed to channels):")
print(f"  chat:jobs subscribers: {r.pubsub_numsub('chat:jobs')[0][1]}")
print(f"  document:jobs subscribers: {r.pubsub_numsub('document:jobs')[0][1]}")

# Create a test request
request_id = str(uuid.uuid4())
chat_session_id = f"test-{int(time.time())}"

# Create CHAT_REQUEST event - same format as backend sends
event = {
    "version": "1.0",
    "requestId": request_id,
    "timestamp": time.time(),
    "type": "CHAT_REQUEST",
    "payload": {
        "chatSessionId": chat_session_id,
        "prompt": "Hello, test message",
        "documentIds": []
    },
    "metadata": {
        "userId": "test-user-id",
        "service": "ragcx-backend",
        "environment": "development",
        "publishedAt": "2026-10-12T10:00:45.803Z",
        "schemaVersion": "1.0",
        "retryCount": 0
    }
}

print(f"\nSending CHAT_REQUEST...")
print(f"Request ID: {request_id}")
print(f"Session ID: {chat_session_id}")

# Publish to the correct channel
r.publish('chat:jobs', json.dumps(event))
print(f"Published to 'chat:jobs' channel")

# Wait a bit and check if there was any activity
print(f"\nWaiting 5 seconds to see if AI service processes it...")
time.sleep(5)

# Try to get any response from Redis using blocking pop
response_key = f"chat:response:{request_id}"
print(f"Checking for response at key: {response_key}")

# The response might be in a different format - check the actual response pattern
print("\nScanning for any recent chat responses...")
keys = r.keys('chat:*')
print(f"Found {len(keys)} chat-related keys:")
for k in keys[:10]:  # Show first 10
    print(f"  {k}: {r.type(k)}")

# Check if there are any recent messages in the channel history
print("\nTrying to get last 5 messages from chat:jobs channel (if Redis supports)...")
# We can't easily get message history without Streams

print("\n🎯 What to check manually:")
print("1. Check AI service logs for any exceptions or processing messages")
print("2. Verify ChatEventHandler is being invoked (look for 'ChatEventHandler: Handling event' in logs)")
print("3. Check if Pipeline.execute() is being called")
print("4. Check if there's a WorkflowEngine error")
print("\n💡 The AI service may have started but crashed on first CHAT_REQUEST")