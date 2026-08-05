import sys
import os
import chromadb

# Ensure app path is in system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def main():
    client = chromadb.PersistentClient(path="data/chroma")
    print("Collections:", client.list_collections())
    try:
        col = client.get_collection("ragcx_documents")
        print("Count of items in ragcx_documents collection:", col.count())
        data = col.get(limit=5)
        print("IDS of first 5 items:", data.get("ids"))
        print("Metadatas of first 5 items:", data.get("metadatas"))
    except Exception as e:
        print("Error accessing collection:", str(e))

if __name__ == "__main__":
    main()
