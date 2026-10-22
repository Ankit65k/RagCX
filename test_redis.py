import redis
import json

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Subscribe to CHAT_JOBS channel to see what's happening
p = r.pubsub()
p.subscribe('chat:jobs')

print("Waiting for messages on chat:jobs channel...")
print("Trigger a suggested questions request from the UI or backend...")
print("Press Ctrl+C to exit\n")

for message in p.listen():
    if message['type'] == 'message':
        try:
            data = json.loads(message['data'])
            print(f"Event: {data.get('eventType', data.get('type', 'unknown'))}")
            print(f"RequestId: {data.get('requestId', 'N/A')}")
            if 'payload' in data:
                print(f"Payload keys: {list(data['payload'].keys())}")
            if data.get('eventType') == 'SUGGESTED_QUESTIONS_RESPONSE':
                print(f"Questions count: {len(data.get('payload', {}).get('questions', []))}")
                print(f"Response: {json.dumps(data, indent=2)[:500]}")
                print()
        except:
            pass

