"""
Test script to reproduce chat error by sending a chat request
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-service'))

from app.schemas.events import BusEvent
from app.dependencies import get_chat_handler
from datetime import datetime

async def test_chat():
    """Send a test chat request and capture the error"""
    print("Initializing chat handler...")
    handler = get_chat_handler()

    # Create a test event
    event = BusEvent(
        eventId="test-event-001",
        eventType="CHAT_REQUEST",
        version="1.0",
        timestamp=datetime.utcnow(),
        correlationId="test-corr-001",
        requestId="test-req-001",
        payload={
            "chatSessionId": "test-session-001",
            "prompt": "What is this document about?",
            "documentIds": []
        },
        metadata={"userId": "test-user"}
    )

    print(f"\nSending chat request: '{event.payload['prompt']}'")
    print(f"Document IDs: {event.payload['documentIds']}")

    try:
        await handler.handle_event(event)
        print("\n✅ Chat request completed successfully")
    except Exception as e:
        print(f"\n❌ Error occurred: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
