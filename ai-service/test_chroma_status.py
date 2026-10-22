"""
Check ChromaDB status to see if vector store is empty
"""
import sys
import os
sys.path.insert(0, '.')

from app.vector_store.chroma import ChromaVectorStore
from app.core.config.settings import settings

async def test_chroma():
    print("Checking ChromaDB vector store status...")

    # Initialize Chroma vector store
    vector_store = ChromaVectorStore(
        collection_name=settings.VECTOR_STORE_COLLECTION,
        persist_directory=settings.VECTOR_STORE_PATH
    )

    # Try to get collection info
    try:
        collection = vector_store.get_collection()
        count = collection.count()
        print(f"✓ ChromaDB collection '{settings.VECTOR_STORE_COLLECTION}' exists")
        print(f"  Total documents in collection: {count}")

        if count > 0:
            # Get some sample documents
            results = collection.peek(limit=min(3, count))
            print(f"  Sample document IDs: {results.get('ids', [])[:3]}")
        else:
            print("  ❌ Vector store is EMPTY - No documents have been uploaded yet")
            print("  This will cause 'No documents' errors when asking questions")

    except Exception as e:
        print(f"❌ Error accessing ChromaDB: {e}")
        print("  This could be causing the chat error")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_chroma())
