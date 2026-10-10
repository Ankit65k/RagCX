import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from app.embeddings.models import EmbeddingResult
from app.vector_store.base import VectorStore
from app.vector_store.models import SearchResultItem, CollectionStats
from app.vector_store.mapper import MetadataMapper
from app.vector_store.exceptions import (
    CollectionNotFoundError,
    VectorInsertError,
    VectorSearchError,
    InvalidEmbeddingError,
)
from app.core.config.settings import settings

logger = logging.getLogger("app")


class ChromaVectorStore(VectorStore):
    """
    ChromaDB implementation of the VectorStore interface.
    """

    def __init__(self, client: ClientAPI) -> None:
        self.client = client
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        self._collection: Optional[Collection] = None

    async def _get_collection(self) -> Collection:
        """
        Dynamically loads or instantiates the default collection, checking the
        embedding model metadata registry to prevent mixing vector spaces.
        """
        if self._collection is None:
            try:
                # Retrieve or create collection with both distance metric AND embedding model metadata
                # IMPORTANT: All metadata must be set during get_or_create_collection.
                # ChromaDB does not allow modifying hnsw:space after collection creation.
                self._collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={
                        "hnsw:space": settings.CHROMA_DISTANCE_METRIC,
                        "embedding_model": settings.EMBEDDING_MODEL,
                    },
                )

                meta = self._collection.metadata or {}
                stored_model = meta.get("embedding_model")

                if stored_model and stored_model != settings.EMBEDDING_MODEL:
                    # Model mismatch: raise validation error to prevent silent data corruption
                    raise InvalidEmbeddingError(
                        f"Embedding model mismatch in collection '{self.collection_name}'. "
                        f"Collection space uses '{stored_model}', but active config settings specify "
                        f"'{settings.EMBEDDING_MODEL}'. Trigger document re-indexing."
                    )

                logger.info(
                    f"VectorStore: Collection '{self.collection_name}' loaded with "
                    f"model '{settings.EMBEDDING_MODEL}' and distance '{settings.CHROMA_DISTANCE_METRIC}'"
                )

            except Exception as e:
                self._collection = None
                if isinstance(e, InvalidEmbeddingError):
                    raise e
                raise CollectionNotFoundError(
                    f"Failed to load vector collection '{self.collection_name}'. Error: {str(e)}"
                )
        return self._collection

    async def create_collection(self, collection_name: str) -> None:
        try:
            self.collection_name = collection_name
            self._collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": settings.CHROMA_DISTANCE_METRIC},
            )
            logger.info(f"VectorStore: Created/Opened collection: {collection_name}")
        except Exception as e:
            raise VectorInsertError(f"Failed to create collection '{collection_name}'. Error: {str(e)}")

    async def delete_collection(self, collection_name: str) -> None:
        try:
            self.client.delete_collection(name=collection_name)
            if self.collection_name == collection_name:
                self._collection = None
            logger.info(f"VectorStore: Deleted collection: {collection_name}")
        except Exception as e:
            raise VectorInsertError(f"Failed to delete collection '{collection_name}'. Error: {str(e)}")

    async def reset_collection(self, collection_name: str) -> None:
        try:
            # We recreate or empty the collection by deleting and creating again
            await self.delete_collection(collection_name)
            await self.create_collection(collection_name)
            logger.info(f"VectorStore: Reset collection: {collection_name}")
        except Exception as e:
            raise VectorInsertError(f"Failed to reset collection '{collection_name}'. Error: {str(e)}")

    async def health_check(self) -> bool:
        try:
            # Ping database by checking heartbeat
            self.client.heartbeat()
            return True
        except Exception:
            return False

    async def insert_embeddings(self, embedding_result: EmbeddingResult) -> None:
        collection = await self._get_collection()
        
        ids: List[str] = []
        vectors: List[List[float]] = []
        metadatas: List[Dict[str, Any]] = []
        documents: List[str] = []

        for item in embedding_result.embeddings:
            # Get text from original reference context if stored or pass placeholder
            text_context = item.metadata.get("text", f"Document chunk reference: {item.chunkId}")
            
            ids.append(item.chunkId)
            vectors.append(item.vector)
            metadatas.append(MetadataMapper.map_to_db(item))
            documents.append(text_context)

        if not ids:
            return

        try:
            logger.info(f"VectorStore: Inserting {len(ids)} vector records into collection '{self.collection_name}'")
            collection.add(
                ids=ids,
                embeddings=vectors,
                metadatas=metadatas,
                documents=documents,
            )
        except Exception as e:
            raise VectorInsertError(f"Failed to add embeddings. Error: {str(e)}")

    async def update_embeddings(self, embedding_result: EmbeddingResult) -> None:
        collection = await self._get_collection()
        
        ids: List[str] = []
        vectors: List[List[float]] = []
        metadatas: List[Dict[str, Any]] = []
        documents: List[str] = []

        for item in embedding_result.embeddings:
            text_context = item.metadata.get("text", f"Document chunk reference: {item.chunkId}")
            
            ids.append(item.chunkId)
            vectors.append(item.vector)
            metadatas.append(MetadataMapper.map_to_db(item))
            documents.append(text_context)

        try:
            collection.update(
                ids=ids,
                embeddings=vectors,
                metadatas=metadatas,
                documents=documents,
            )
            logger.info(f"VectorStore: Updated {len(ids)} vector records.")
        except Exception as e:
            raise VectorInsertError(f"Failed to update embeddings. Error: {str(e)}")

    async def delete_document(self, document_id: str) -> None:
        collection = await self._get_collection()
        try:
            # Metadata filtering for deletion
            collection.delete(where={"documentId": document_id})
            logger.info(f"VectorStore: Deleted all vectors for documentId: {document_id}")
        except Exception as e:
            raise VectorInsertError(f"Failed to delete document {document_id}. Error: {str(e)}")

    async def delete_chunk(self, chunk_id: str) -> None:
        collection = await self._get_collection()
        try:
            collection.delete(ids=[chunk_id])
            logger.info(f"VectorStore: Deleted chunkId: {chunk_id}")
        except Exception as e:
            raise VectorInsertError(f"Failed to delete chunk {chunk_id}. Error: {str(e)}")

    async def similarity_search(
        self,
        query_vector: List[float],
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SearchResultItem]:
        collection = await self._get_collection()
        try:
            logger.info(f"VectorStore: Performing vector query (Top K: {top_k})")

            # Map parameters to Chroma syntax
            where_filter = None
            if filter_metadata:
                # Handle documentIds array filter
                if "documentIds" in filter_metadata and filter_metadata["documentIds"]:
                    doc_ids = filter_metadata["documentIds"]
                    # Use ChromaDB's $in operator for multiple document filtering
                    where_filter = {"documentId": {"$in": doc_ids}}
                    logger.info(f"VectorStore: Filtering by documentIds: {doc_ids}")
                else:
                    where_filter = filter_metadata

            results = collection.query(
                query_embeddings=[query_vector],
                n_results=top_k,
                where=where_filter,
            )

            items: List[SearchResultItem] = []
            
            # ChromaDB returns nested arrays: ids[0], distances[0], metadatas[0], documents[0]
            if results and results.get("ids") and len(results["ids"]) > 0:
                ids = results["ids"][0]
                distances = results.get("distances", [[]])[0]
                metadatas = results.get("metadatas", [[]])[0]
                documents = results.get("documents", [[]])[0]

                for idx, cid in enumerate(ids):
                    # Chroma distances map to similarity score (smaller distance = higher similarity)
                    # We compute score as 1 - distance or pass distance as score
                    dist = distances[idx] if idx < len(distances) else 0.0
                    score = 1.0 - dist if settings.CHROMA_DISTANCE_METRIC == "cosine" else dist
                    
                    if score_threshold is not None and score < score_threshold:
                        continue

                    meta = metadatas[idx] if idx < len(metadatas) else {}
                    text = documents[idx] if idx < len(documents) else ""

                    mapped = MetadataMapper.map_from_db(meta)
                    items.append(
                        SearchResultItem(
                            text=text,
                            metadata=meta,
                            score=round(float(score), 4),
                            documentId=mapped["documentId"] or "",
                            pageNumber=mapped["pageNumber"],
                            chunkIndex=mapped["chunkIndex"],
                        )
                    )

            return items
        except Exception as e:
            raise VectorSearchError(f"Vector search failed. Error: {str(e)}")

    async def get_statistics(self) -> CollectionStats:
        collection = await self._get_collection()
        try:
            count = collection.count()
            
            # Get list of unique document IDs in collection metadata
            data = collection.get(include=["metadatas"])
            unique_docs = set()
            if data and data.get("metadatas"):
                for m in data["metadatas"]:
                    if m and m.get("documentId"):
                        unique_docs.add(m["documentId"])

            return CollectionStats(
                totalDocuments=len(unique_docs),
                totalChunks=count,
                collectionSizeByte=count * settings.EMBEDDING_DIMENSIONS * 4, # Float32 estimation
                embeddingModel=settings.EMBEDDING_MODEL,
                dimension=settings.EMBEDDING_DIMENSIONS,
            )
        except Exception as e:
            raise VectorSearchError(f"Failed to load collection statistics. Error: {str(e)}")
