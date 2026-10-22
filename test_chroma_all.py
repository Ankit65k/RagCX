#!/usr/bin/env python3
import chromadb
from chromadb.config import Settings

# Connect to ChromaDB
client = chromadb.PersistentClient(
    path="ai-service/data/chroma/",
    settings=Settings(allow_reset=True, anonymized_telemetry=False)
)

# Get collection
collections = client.list_collections()
print(f"Collections: {[c.name for c in collections]}")

collection = client.get_collection("ragcx_documents")

# Get ALL items
all_data = collection.get()
print(f"\n=== ALL {len(all_data['ids'])} CHUNKS IN CHROMADB ===\n")

for i in range(len(all_data['ids'])):
    chunk_id = all_data['ids'][i]
    document_id = all_data['metadatas'][i].get('documentId', 'unknown')
    content_preview = all_data['documents'][i][:150].replace('\n', ' ')
    page = all_data['metadatas'][i].get('pageNumber', '?')

    print(f"[{i+1}] DocID: {document_id}")
    print(f"    Chunk: {chunk_id}")
    print(f"    Page: {page}")
    print(f"    Preview: {content_preview}...")
    print("-" * 60)

# Get unique document IDs
unique_docs = set(meta.get('documentId') for meta in all_data['metadatas'])
print(f"\n=== UNIQUE DOCUMENTS: {len(unique_docs)} ===")
for doc_id in sorted(unique_docs):
    count = sum(1 for meta in all_data['metadatas'] if meta.get('documentId') == doc_id)
    print(f"  {doc_id}: {count} chunks")