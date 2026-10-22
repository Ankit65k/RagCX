"""
Simple test to reproduce the actual error
"""
import sys
import os
import asyncio
sys.path.insert(0, '.')

async def test():
    from app.core.dependencies.container import Container
    from app.schemas.events import BusEvent
    from datetime import datetime, timezone

    container = Container()

    # Get the chat event handler
    chat_handler = container.chat_event_handler()

    # Create test event like the frontend would send
    event = BusEvent(
        eventId="test-event-error",
        eventType="CHAT_REQUEST",
        version="1.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        correlationId="test-corr-error",
        requestId="test-req-error",
        payload={
            "chatSessionId": "test-session-error",
            "prompt": "What is this document about?",
            "documentIds": []
        },
        metadata={"userId": "test-user"}
    )

    print(f"Testing chat with query: '{event.payload['prompt']}'")
    print(f"Document IDs: {event.payload['documentIds']}")

    try:
        await chat_handler.handle_event(event)
        print("[OK] Chat request processed successfully")
    except Exception as e:
        print(f"[ERROR] Error during handle_event: {type(e).__name__}: {e}")
        print("\nFull traceback:")
        import traceback
        traceback.print_exc()

    # Wait a moment to see if any background errors occur
    await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(test())
