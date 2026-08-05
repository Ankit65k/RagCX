import time
import logging
from typing import List

from app.processors.interfaces import (
    IDocumentProcessor,
    IPDFValidator,
    IPDFLoader,
    IMetadataExtractor,
    IPageExtractor,
    IChunkGenerator,
)
from app.processors.models import ProcessingResult, ProcessingStats
from app.processors.exceptions import ProcessingPipelineError

logger = logging.getLogger("app")


class DocumentProcessor(IDocumentProcessor):
    """
    Main Document Processor orchestrator coordinating PDF text extraction pipelines.
    """

    def __init__(
        self,
        validator: IPDFValidator,
        loader: IPDFLoader,
        metadata_extractor: IMetadataExtractor,
        page_extractor: IPageExtractor,
        chunk_generator: IChunkGenerator,
    ) -> None:
        self.validator = validator
        self.loader = loader
        self.metadata_extractor = metadata_extractor
        self.page_extractor = page_extractor
        self.chunk_generator = chunk_generator

    async def process(self, file_path: str, document_id: str) -> ProcessingResult:
        logger.info(f"Pipeline: Starting PDF processing for file: {file_path} (Doc ID: {document_id})")
        start_time = time.perf_counter()

        try:
            # 1. Validate PDF file attributes and limits
            self.validator.validate(file_path)
            logger.info("Pipeline: PDF validation checks passed.")

            # 2. Open Document Stream
            doc = self.loader.load(file_path)
            logger.info("Pipeline: PDF stream loaded successfully.")

            try:
                # 3. Extract Document Metadata
                metadata = self.metadata_extractor.extract(doc, file_path, document_id)
                logger.info("Pipeline: Document metadata extraction completed.")

                # 4. Extract clean pages
                pages = self.page_extractor.extract_pages(doc)
                logger.info(f"Pipeline: Page text extraction completed ({len(pages)} pages extracted).")

                # 5. Segment pages into text chunks
                chunks = self.chunk_generator.generate_chunks(pages, document_id)
                logger.info(f"Pipeline: Text chunking completed ({len(chunks)} chunks created).")

            finally:
                doc.close()

            # 6. Aggregate processing stats
            total_chars = sum(p.characterCount for p in pages)
            total_words = sum(p.wordCount for p in pages)
            avg_chunk = (
                sum(len(c.text) for c in chunks) / len(chunks)
                if chunks
                else 0.0
            )

            stats = ProcessingStats(
                totalPages=len(pages),
                totalChunks=len(chunks),
                averageChunkSize=round(avg_chunk, 2),
                totalCharacters=total_chars,
                totalWords=total_words,
            )

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            logger.info(f"Pipeline: Processing completed in {elapsed_ms:.2f}ms.")

            return ProcessingResult(
                metadata=metadata,
                pages=pages,
                chunks=chunks,
                statistics=stats,
                processingTimeMs=round(elapsed_ms, 2),
            )

        except Exception as e:
            logger.error(f"Pipeline: PDF processing failed for {file_path}. Error: {str(e)}")
            if not isinstance(e, Exception):
                raise ProcessingPipelineError(str(e))
            raise e
