from typing import Dict, Any
from datetime import datetime, timezone

from app.embeddings.models import EmbeddingItem


class MetadataMapper:
    """
    Standardizes database schema formatting for vector collections, 
    mapping DTO items to flat dictionaries suitable for vector stores.
    """

    @staticmethod
    def map_to_db(item: EmbeddingItem) -> Dict[str, Any]:
        flat_meta = {
            "documentId": item.documentId,
            "chunkId": item.chunkId,
            "pageNumber": item.pageNumber,
            "chunkIndex": item.chunkIndex,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        # Include nested metadata fields flatly
        for k, v in item.metadata.items():
            if isinstance(v, (str, int, float, bool)):
                flat_meta[k] = v
            else:
                flat_meta[k] = str(v)

        return flat_meta

    @staticmethod
    def map_from_db(db_meta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reconstructs structured typing from stored flat attributes.
        """
        # Chroma returns flat fields. We convert them back
        page_num = db_meta.get("pageNumber")
        chunk_idx = db_meta.get("chunkIndex")
        
        return {
            "documentId": db_meta.get("documentId"),
            "chunkId": db_meta.get("chunkId"),
            "pageNumber": int(page_num) if page_num is not None else 0,
            "chunkIndex": int(chunk_idx) if chunk_idx is not None else 0,
            "createdAt": db_meta.get("createdAt"),
            "original_metadata": db_meta,
        }
