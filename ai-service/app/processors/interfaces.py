from abc import ABC, abstractmethod
from typing import List, Dict, Any, Generator
import fitz

from app.processors.models import (
    DocumentMetadata,
    DocumentPage,
    DocumentChunk,
    ProcessingResult,
)


class IPDFValidator(ABC):
    @abstractmethod
    def validate(self, file_path: str) -> None:
        """
        Validates path, sizing limits, MIME structures, passwords, and page limits.
        """
        pass


class IPDFLoader(ABC):
    @abstractmethod
    def load(self, file_path: str) -> fitz.Document:
        """
        Opens and returns a PyMuPDF Document object.
        """
        pass


class IMetadataExtractor(ABC):
    @abstractmethod
    def extract(self, doc: fitz.Document, file_path: str, document_id: str) -> DocumentMetadata:
        """
        Extracts document-level metadata, versions, and checksum hashes.
        """
        pass


class IPageExtractor(ABC):
    @abstractmethod
    def extract_pages(self, doc: fitz.Document) -> List[DocumentPage]:
        """
        Converts document pages to DocumentPage containers holding character counts.
        """
        pass


class ITextCleaner(ABC):
    @abstractmethod
    def clean(self, text: str) -> str:
        """
        Removes repeated whitespaces, handles broken lines, and normalizes Unicode.
        """
        pass


class IChunkGenerator(ABC):
    @abstractmethod
    def generate_chunks(self, pages: List[DocumentPage], document_id: str) -> List[DocumentChunk]:
        """
        Splits clean page texts into chunks adhering to dimensions and overlap limits.
        """
        pass


class IDocumentProcessor(ABC):
    @abstractmethod
    async def process(self, file_path: str, document_id: str) -> ProcessingResult:
        """
        Runs the full PDF processing pipeline from validation to chunking.
        """
        pass
