import os
import re
import hashlib
import unicodedata
from typing import List, Dict, Any, Optional
import fitz

from app.processors.interfaces import (
    IPDFValidator,
    IPDFLoader,
    IMetadataExtractor,
    IPageExtractor,
    ITextCleaner,
    IChunkGenerator,
)
from app.processors.models import DocumentMetadata, DocumentPage, DocumentChunk
from app.processors.exceptions import (
    PDFValidationError,
    PDFLoadError,
    TextExtractionError,
    ChunkGenerationError,
)
from app.core.config.settings import settings


# ─── 1. PDF Validator ─────────────────────────────────────────────────────────

class PDFValidator(IPDFValidator):
    def validate(self, file_path: str) -> None:
        # Check file exists
        if not os.path.exists(file_path):
            raise PDFValidationError(f"File does not exist: {file_path}")

        # Check file size limits
        size = os.path.getsize(file_path)
        if size > settings.PROC_MAX_FILE_SIZE:
            raise PDFValidationError(
                f"File size ({size} bytes) exceeds limit ({settings.PROC_MAX_FILE_SIZE} bytes)"
            )

        # Basic extension check
        ext = os.path.splitext(file_path)[1].lower().replace(".", "")
        if ext not in settings.PROC_ALLOWED_EXTENSIONS:
            raise PDFValidationError(f"File extension '.{ext}' is not allowed.")

        # Attempt to open and validate PDF layout
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise PDFValidationError(f"Failed to parse PDF document (corrupt file). Error: {str(e)}")

        try:
            # Check password protection
            if doc.is_encrypted:
                raise PDFValidationError("PDF document is password protected / encrypted.")

            # Check page boundaries
            if doc.page_count > settings.PROC_MAX_PAGES:
                raise PDFValidationError(
                    f"Page count ({doc.page_count}) exceeds limit ({settings.PROC_MAX_PAGES})"
                )
        finally:
            doc.close()


# ─── 2. PDF Loader ────────────────────────────────────────────────────────────

class PDFLoader(IPDFLoader):
    def load(self, file_path: str) -> fitz.Document:
        try:
            return fitz.open(file_path)
        except Exception as e:
            raise PDFLoadError(f"Failed to open PDF stream for {file_path}. Error: {str(e)}")


# ─── 3. Metadata Extractor ────────────────────────────────────────────────────

class MetadataExtractor(IMetadataExtractor):
    def extract(self, doc: fitz.Document, file_path: str, document_id: str) -> DocumentMetadata:
        try:
            # Extract basic PDF headers
            meta = doc.metadata or {}
            
            # Compute file checksum (SHA-256)
            sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                while chunk := f.read(8192):
                    sha256.update(chunk)
            checksum = sha256.hexdigest()

            return DocumentMetadata(
                documentId=document_id,
                filename=os.path.basename(file_path),
                pageCount=doc.page_count,
                author=meta.get("author"),
                title=meta.get("title"),
                creationDate=meta.get("creationDate"),
                modificationDate=meta.get("modDate"),
                pdfVersion=meta.get("format"),
                fileSize=os.path.getsize(file_path),
                checksum=checksum,
            )
        except Exception as e:
            raise ProcessingPipelineError(f"Failed to extract document metadata. Error: {str(e)}")


# ─── 4. Page Extractor & Text Cleaner ──────────────────────────────────────────

class TextCleaner(ITextCleaner):
    def clean(self, text: str) -> str:
        if not text:
            return ""
        
        # Normalize Unicode representations (NFKC)
        cleaned = unicodedata.normalize("NFKC", text)

        # Normalize linebreaks and remove broken lines hyphens
        # (e.g. multi-line words combined back together)
        cleaned = re.sub(r"(\w+)-\n(\w+)", r"\1\2", cleaned)

        # Replace double newlines with placeholder to preserve paragraphs
        cleaned = re.sub(r"\n\s*\n", "\n\n", cleaned)

        # Replace single newlines within paragraphs with spaces
        # (retains paragraphs separated by double newlines)
        paragraphs = cleaned.split("\n\n")
        rebuilt = []
        for p in paragraphs:
            # Flatten internal line endings to spaces
            flat_p = re.sub(r"(?<!\n)\n(?!\n)", " ", p)
            # Remove repeated spaces
            flat_p = re.sub(r"[ \t]+", " ", flat_p)
            rebuilt.append(flat_p.strip())

        cleaned = "\n\n".join(rebuilt)
        return cleaned.strip()


class PageExtractor(IPageExtractor):
    def __init__(self, cleaner: ITextCleaner) -> None:
        self.cleaner = cleaner

    def extract_pages(self, doc: fitz.Document) -> List[DocumentPage]:
        pages = []
        for i, page in enumerate(doc):
            try:
                # Extract text using PyMuPDF block formatting
                raw_text = page.get_text("text")
                cleaned_text = self.cleaner.clean(raw_text)

                words = len(cleaned_text.split())
                pages.append(
                    DocumentPage(
                        pageNumber=i + 1,
                        rawText=cleaned_text,
                        characterCount=len(cleaned_text),
                        wordCount=words,
                    )
                )
            except Exception as e:
                raise TextExtractionError(f"Failed to extract text from page {i + 1}. Error: {str(e)}")
        return pages


# ─── 5. Chunk Generator ───────────────────────────────────────────────────────

class ChunkGenerator(IChunkGenerator):
    def __init__(self, chunk_size: int, chunk_overlap: int) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def generate_chunks(self, pages: List[DocumentPage], document_id: str) -> List[DocumentChunk]:
        chunks = []
        chunk_idx = 0

        for page in pages:
            text = page.rawText
            if not text:
                continue

            # Split page text recursively preserving paragraphs, sentences, words
            split_texts = self._recursive_split(text, ["\n\n", ". ", " ", ""])
            
            offset = 0
            for segment in split_texts:
                seg_len = len(segment)
                if seg_len == 0:
                    continue

                words = len(segment.split())
                
                # Create unique chunk ID
                chunk_id = f"{document_id}_p{page.pageNumber}_c{chunk_idx}"
                
                chunks.append(
                    DocumentChunk(
                        chunkId=chunk_id,
                        documentId=document_id,
                        pageNumber=page.pageNumber,
                        chunkIndex=chunk_idx,
                        text=segment,
                        startOffset=offset,
                        endOffset=offset + seg_len,
                        characterCount=seg_len,
                        wordCount=words,
                    )
                )
                chunk_idx += 1
                # Increment offset for page bounds tracking
                offset += seg_len

        return chunks

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """
        Recursive splitting implementation preserving paragraphs/sentences.
        """
        if len(text) <= self.chunk_size or not separators:
            return [text]

        sep = separators[0]
        splits = text.split(sep)
        
        chunks = []
        current_chunk = ""

        for part in splits:
            # Re-append the separator if we split by something meaningful like sentence boundary
            candidate = current_chunk + (sep if current_chunk else "") + part
            
            if len(candidate) <= self.chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                
                # If a single part exceeds chunk size, split it with the next separator
                if len(part) > self.chunk_size:
                    sub_chunks = self._recursive_split(part, separators[1:])
                    chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    current_chunk = part

        if current_chunk:
            chunks.append(current_chunk)

        # Resolve overlaps where possible
        return self._merge_overlaps(chunks)

    def _merge_overlaps(self, chunks: List[str]) -> List[str]:
        if len(chunks) <= 1:
            return chunks

        merged = []
        for i, chunk in enumerate(chunks):
            if i == 0:
                merged.append(chunk)
                continue
            
            # Prepend overlap characters from previous chunk
            prev = chunks[i - 1]
            overlap_text = prev[-self.chunk_overlap:] if len(prev) > self.chunk_overlap else prev
            merged.append(overlap_text + " " + chunk)

        return merged
