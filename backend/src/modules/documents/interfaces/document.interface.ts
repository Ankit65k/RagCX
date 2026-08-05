import { DocumentMetadata } from '../types/document.types.js';
import { DocumentProcessingStatus } from '../constants/document.constants.js';

/**
 * Interface representing the database metadata tracking logic for documents.
 */
export interface IDocumentService {
  /**
   * Initializes a new document tracking record with metadata.
   */
  createMetadata(data: Omit<DocumentMetadata, 'uploadedAt' | 'updatedAt' | 'status'>): Promise<DocumentMetadata>;

  /**
   * Updates the lifecycle/processing state of the document.
   */
  updateStatus(documentId: string, status: DocumentProcessingStatus): Promise<DocumentMetadata>;

  /**
   * Soft deletes a document record, marking its processing status as DELETED.
   */
  softDelete(documentId: string): Promise<void>;

  /**
   * Restores a soft-deleted document back to its last active status.
   */
  restore(documentId: string, targetStatus?: DocumentProcessingStatus): Promise<DocumentMetadata>;
}

export default IDocumentService;
