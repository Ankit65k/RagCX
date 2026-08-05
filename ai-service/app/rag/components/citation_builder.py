import logging
from typing import List

from app.rag.models import CitationItem
from app.retrievers.models import RetrievedChunk

logger = logging.getLogger("app")


class CitationBuilder:
    """
    Builds structured citations from retrieved chunks.

    Ensures that every citation contains the precise metadata (document ID,
    filename, page number, chunk ID, similarity score) so that answers can
    be verified back to the original source.
    """

    def build_citations(self, chunks: List[RetrievedChunk]) -> List[CitationItem]:
        citations: List[CitationItem] = []
        seen = set()

        for chunk in chunks:
            # Deduplicate citations based on document ID, page, and chunk index
            unique_key = (chunk.documentId, chunk.pageNumber, chunk.chunkIndex)
            if unique_key in seen:
                continue
            seen.add(unique_key)

            # Metadata properties extraction with fallback defaults
            metadata = chunk.metadata or {}
            filename = metadata.get("filename") or metadata.get("source") or "unknown_document"

            citations.append(
                CitationItem(
                    documentId=chunk.documentId,
                    filename=filename,
                    pageNumber=chunk.pageNumber,
                    chunkId=chunk.chunkId,
                    score=chunk.score,
                )
            )

        logger.debug(f"CitationBuilder: Built {len(citations)} citations from {len(chunks)} chunks.")
        return citations
