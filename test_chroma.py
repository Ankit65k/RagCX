#!/usr/bin/env python3
import chromadb
from chromadb.config import Settings

# Connect to ChromaDB
client = chromadb.PersistentClient(
    path="ai-service/data/chroma/",
    settings=Settings(allow_reset=True, anonymized_telemetry=False)
)

# Get all collections
collections = client.list_collections()
print(f"Collections found: {len(collections)}")
for col in collections:
    print(f"\n=== Collection: {col.name} ===")

    # Get some samples from each collection
    try:
        results = col.get()
        if results and len(results['ids']) > 0:
            print(f"Total items: {len(results['ids'])}")

            # Show first few items
            for i in range(min(3, len(results['ids']))):
                print(f"\nItem {i+1}:")
                print(f"  ID: {results['ids'][i]}")
                if 'documents' in results and results['documents']:
                    print(f"  Content preview: {results['documents'][i][:200]}...")
                if 'metadatas' in results and results['metadatas']:
                    meta = results['metadatas'][i]
                    print(f"  Metadata: {meta}")
                print("-" * 50)
    except Exception as e:
        print(f"  Error reading collection: {e}")

# Now test a query
if collections:
    collection = collections[0]  # Get first collection
    print(f"\n\n=== Testing query: 'work experience' ===")

    try:
        results = collection.query(
            query_texts=["work experience"],
            n_results=5
        )

        if results and 'ids' in results and len(results['ids'][0]) > 0:
            print(f"Found {len(results['ids'][0])} results:")
            for i in range(len(results['ids'][0])):
                print(f"\nResult {i+1}:")
                print(f"  ID: {results['ids'][0][i]}")
                if 'distances' in results:
                    print(f"  Distance: {results['distances'][0][i]:.4f}")
                if 'documents' in results:
                    print(f"  Content: {results['documents'][0][i][:300]}...")
                if 'metadatas' in results:
                    print(f"  Metadata: {results['metadatas'][0][i]}")
        else:
            print("No results found for query")
    except Exception as e:
        print(f"Query error: {e}")