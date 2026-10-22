#!/usr/bin/env python3
"""
Direct test script to measure chat latency with full Ollama timing metrics.
Calls the AI service workflow directly.
"""

import asyncio
import json
import time
import logging
from uuid import uuid4

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("chat_latency_test")

# AI Service URL
AI_SERVICE_URL = "http://localhost:8000"


async def test_chat_direct():
    """Call the chat workflow directly via HTTP"""
    import httpx

    # Test document ID (from ChromaDB)
    doc_id = "2fd5cd35-ba03-48e1-8cbb-8d54e6a60278"

    # Test queries - in-PDF and out-of-PDF
    test_queries = [
        {
            "name": "in_pdf_question",
            "query": "What is the appointment date and time?",
            "document_ids": [doc_id],
            "expect_answer": True
        },
        {
            "name": "out_of_pdf_question",
            "query": "What is the capital of France?",
            "document_ids": [doc_id],
            "expect_answer": False
        },
        {
            "name": "in_pdf_specific",
            "query": "What documents do I need to bring?",
            "document_ids": [doc_id],
            "expect_answer": True
        }
    ]

    async with httpx.AsyncClient() as client:
        for test in test_queries:
            logger.info(f"\n{'='*70}")
            logger.info(f"TEST: {test['name']}")
            logger.info(f"Query: {test['query']}")
            logger.info(f"Document IDs: {test['document_ids']}")
            logger.info(f"Expected answer in doc: {test['expect_answer']}")
            logger.info("-" * 70)

            request_id = str(uuid4())
            payload = {
                "conversationId": str(uuid4()),
                "query": test["query"],
                "documentIds": test["document_ids"],
                "top_k": 5
            }

            logger.info(f"Request ID: {request_id}")
            logger.info(f"Sending request...")

            start_time = time.perf_counter()

            try:
                response = await client.post(
                    f"{AI_SERVICE_URL}/api/v1/chat/events",
                    json=payload,
                    timeout=180.0
                )

                total_time_ms = (time.perf_counter() - start_time) * 1000
                logger.info(f"Response received in {total_time_ms:.1f}ms")
                logger.info(f"Status: {response.status_code}")

                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"\nResponse:")
                    logger.info(json.dumps(result, indent=2))
                else:
                    logger.error(f"Error: {response.text}")

            except httpx.TimeoutException:
                logger.error("Request timed out!")
            except Exception as e:
                logger.error(f"Request failed: {e}")

    logger.info("\n" + "="*70)
    logger.info("TEST COMPLETED - Check AI service logs for detailed timing")


if __name__ == "__main__":
    asyncio.run(test_chat_direct())