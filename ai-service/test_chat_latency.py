#!/usr/bin/env python3
"""
Test script to measure chat latency with Ollama timing metrics.
This simulates a chat request directly to the AI service via Redis.
"""

import asyncio
import json
import redis.asyncio as redis
import time
import logging
from uuid import uuid4
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("chat_latency_test")

# Redis connection
REDIS_URL = "redis://localhost:6379"

async def test_chat_latency():
    """Send a test chat message and measure timing"""

    # Connect to Redis
    try:
        redis_client = await redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return

    # Test document ID (from ChromaDB)
    document_id = "2fd5cd35-ba03-48e1-8cbb-8d54e6a60278"

    # Test queries
    test_queries = [
        {
            "name": "in_pdf_question",
            "query": "What is the appointment date and time?",
            "document_ids": [document_id],
            "expect_answer": True
        },
        {
            "name": "out_of_pdf_question",
            "query": "What is the capital of France?",
            "document_ids": [document_id],
            "expect_answer": False
        },
        {
            "name": "specific_question",
            "query": "What documents do I need to bring?",
            "document_ids": [document_id],
            "expect_answer": True
        }
    ]

    for idx, test in enumerate(test_queries):
        logger.info(f"\n{'='*70}")
        logger.info(f"TEST {idx+1}: {test['name']}")
        logger.info(f"Query: {test['query']}")
        logger.info(f"Document IDs: {test['document_ids']}")
        logger.info(f"Expected answer in doc: {test['expect_answer']}")
        logger.info("-" * 70)

        request_id = str(uuid4())
        chat_session_id = str(uuid4())

        # Create chat event matching the expected format
        chat_event = {
            "eventId": str(uuid4()),
            "eventType": "CHAT_REQUEST",
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "correlationId": request_id,
            "requestId": request_id,
            "producer": "test-script",
            "payload": {
                "chatSessionId": chat_session_id,
                "prompt": test["query"],
                "documentIds": test["document_ids"]
            },
            "metadata": {
                "userId": "test-user",
                "test": test["name"]
            }
        }

        logger.info(f"Request ID: {request_id}")
        logger.info(f"Chat Session ID: {chat_session_id}")
        logger.info(f"Sending event to chat:jobs channel...")

        start_time = time.perf_counter()

        try:
            # Publish to Redis
            await redis_client.publish(
                "chat:jobs",
                json.dumps(chat_event)
            )
            logger.info("✓ Chat event published to Redis")
            logger.info("\n⏳ Waiting 30 seconds for AI service to process...")
            logger.info("📋 Check AI service logs for detailed timing breakdown")

            # Wait for processing
            await asyncio.sleep(30)

            total_time = time.perf_counter() - start_time
            logger.info(f"\n⏱️  Total elapsed: {total_time:.2f}s")

        except Exception as e:
            logger.error(f"Error during test: {e}")

        # Small delay between tests
        if idx < len(test_queries) - 1:
            logger.info("\nWaiting 5 seconds before next test...")
            await asyncio.sleep(5)

    await redis_client.close()
    logger.info("\n" + "="*70)
    logger.info("✅ ALL TESTS COMPLETED")
    logger.info("Check AI service logs for detailed Ollama timing breakdown")

if __name__ == "__main__":
    asyncio.run(test_chat_latency())