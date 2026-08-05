import { DocumentServiceError } from './document-service.errors.js';

/**
 * Thrown when trying to delete an already deleted document.
 */
export class DocumentAlreadyDeletedError extends DocumentServiceError {
  constructor(documentId: string) {
    super(`Document "${documentId}" is already deleted.`, 'DOCUMENT_ALREADY_DELETED');
    this.name = 'DocumentAlreadyDeletedError';
  }
}

/**
 * Thrown when trying to run operations on a document that is currently processing.
 */
export class DocumentAlreadyProcessingError extends DocumentServiceError {
  constructor(documentId: string) {
    super(`Document "${documentId}" is currently being processed and cannot be mutated.`, 'DOCUMENT_ALREADY_PROCESSING');
    this.name = 'DocumentAlreadyProcessingError';
  }
}

/**
 * Thrown when a document restoration operation fails due to validation.
 */
export class DocumentRestoreError extends DocumentServiceError {
  constructor(documentId: string, reason: string) {
    super(`Failed to restore document "${documentId}": ${reason}`, 'DOCUMENT_RESTORE_FAILED');
    this.name = 'DocumentRestoreError';
  }
}

/**
 * Thrown when a document is not eligible for reprocessing.
 */
export class ReprocessNotAllowedError extends DocumentServiceError {
  constructor(documentId: string, reason: string) {
    super(`Reprocessing not allowed for document "${documentId}": ${reason}`, 'REPROCESS_NOT_ALLOWED');
    this.name = 'ReprocessNotAllowedError';
  }
}
