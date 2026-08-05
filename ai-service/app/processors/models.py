from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    documentId: str
    filename: str
    pageCount: int
    author: Optional[str] = None
    title: Optional[str] = None
    creationDate: Optional[str] = None
    modificationDate: Optional[str] = None
    pdfVersion: Optional[str] = None
    fileSize: int
    checksum: str


class DocumentPage(BaseModel):
    pageNumber: int
    rawText: str
    characterCount: int
    wordCount: int


class DocumentChunk(BaseModel):
    chunkId: str
    documentId: str
    pageNumber: int
    chunkIndex: int
    text: str
    startOffset: int
    endOffset: int
    characterCount: int
    wordCount: int


class ProcessingStats(BaseModel):
    totalPages: int
    totalChunks: int
    averageChunkSize: float
    totalCharacters: int
    totalWords: int


class ProcessingResult(BaseModel):
    metadata: DocumentMetadata
    pages: List[DocumentPage]
    chunks: List[DocumentChunk]
    statistics: ProcessingStats
    processingTimeMs: float
