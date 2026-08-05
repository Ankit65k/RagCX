class PDFProcessorError(Exception):
    """Base exception for all PDF processor failures."""
    pass


class PDFValidationError(PDFProcessorError):
    """Raised when a PDF fails size, page limit, password, or mime validations."""
    pass


class PDFLoadError(PDFProcessorError):
    """Raised when opening or parsing the file stream fails."""
    pass


class TextExtractionError(PDFProcessorError):
    """Raised when pulling character streams from individual pages fails."""
    pass


class ChunkGenerationError(PDFProcessorError):
    """Raised when text splitting operations fail."""
    pass


class ProcessingPipelineError(PDFProcessorError):
    """Raised when general failures occur during document orchestration."""
    pass
