import { Document, ProcessingStatus, UploadStatus } from '@prisma/client';
import { PaginatedResult } from '../../../database/repositories/pagination.js';
import type { UploadedFileContext } from '../../../infrastructure/storage/interfaces/storage-provider.interface.js';
import type { DocumentPaginationOptions } from './document-repository.interface.js';

// ─────────────────────────────────────────────────────────────────────────────
// Upload command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All data the Document Service needs to orchestrate an upload.
 * Constructed by the controller from `req.uploadedFile` and `req.user`.
 */
export interface UploadDocumentCommand {
  /** Hydrated file context from the upload middleware. */
  file: UploadedFileContext & { buffer: Buffer };

  /** ID of the authenticated user performing the upload. */
  uploadedBy: string;

  /** Optional correlation ID for request tracing across services. */
  correlationId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `IDocumentService` — orchestration contract for the Document module.
 *
 * The service is the only layer that:
 * - Coordinates storage + database + Redis events.
 * - Enforces business rules (duplicate detection, ownership, state transitions).
 * - Handles cross-cutting concerns (logging, error translation).
 *
 * Controllers depend exclusively on this interface — never on concrete classes.
 */
export interface IDocumentService {
  /**
   * Orchestrates the full upload pipeline:
   * duplicate check → storage upload → DB record → Redis event.
   *
   * @throws {DuplicateDocumentError}   When the same content already exists.
   * @throws {StorageFailureError}      When the storage write fails.
   */
  uploadDocument(command: UploadDocumentCommand): Promise<Document>;

  /**
   * Retrieves a single document by its primary-key UUID.
   *
   * @throws {DocumentNotFoundError}    When no document with that ID exists.
   * @throws {DocumentOwnershipError}   When `requestedBy` does not own it.
   */
  getDocument(id: string, requestedBy: string): Promise<Document>;

  /**
   * Paginated, filterable, searchable document listing.
   * Scoped to `uploadedBy` unless called with admin privileges (future).
   */
  listDocuments(
    uploadedBy: string,
    options?: DocumentPaginationOptions,
  ): Promise<PaginatedResult<Document>>;

  /**
   * Full-text search over originalFileName with filter + sort support.
   */
  searchDocuments(
    uploadedBy: string,
    options: DocumentPaginationOptions,
  ): Promise<PaginatedResult<Document>>;

  /**
   * Marks a document as deleted in the DB and removes the physical file.
   *
   * @throws {DocumentNotFoundError}       When no document with that ID exists.
   * @throws {DocumentOwnershipError}      When `deletedBy` does not own it.
   * @throws {InvalidDocumentStateError}   When already deleted.
   * @throws {StorageFailureError}         When the file deletion fails.
   */
  deleteDocument(id: string, deletedBy: string): Promise<void>;

  /**
   * Restores a soft-deleted document back to UPLOADED / PENDING state.
   *
   * @throws {DocumentNotFoundError}       When no document with that ID exists.
   * @throws {DocumentOwnershipError}      When `restoredBy` does not own it.
   * @throws {InvalidDocumentStateError}   When the document is not deleted.
   */
  restoreDocument(id: string, restoredBy: string): Promise<Document>;

  /**
   * Triggers reprocessing by setting status to REPROCESSING and publishing
   * a `DOCUMENT_REPROCESS_REQUESTED` Redis event.
   *
   * @throws {DocumentNotFoundError}       When no document with that ID exists.
   * @throws {DocumentOwnershipError}      When `requestedBy` does not own it.
   * @throws {InvalidDocumentStateError}   When the document is not in a reprocessable state.
   */
  reprocessDocument(id: string, requestedBy: string): Promise<Document>;

  /**
   * Applies a processing status update (called by the Redis subscriber
   * when the Python AI service reports progress).
   * Does NOT enforce ownership — internal callback only.
   */
  updateProcessingStatus(
    id: string,
    processingStatus: ProcessingStatus,
    uploadStatus?: UploadStatus,
  ): Promise<Document>;

  /**
   * Verifies whether an identical document (same checksum) already exists
   * for the given user. Returns the existing document if found.
   */
  checkDuplicate(checksum: string, uploadedBy: string): Promise<Document | null>;

  /**
   * Verifies that `userId` is the owner of `documentId`.
   *
   * @throws {DocumentNotFoundError}    When no document with that ID exists.
   * @throws {DocumentOwnershipError}   When `userId` does not own it.
   */
  verifyOwnership(documentId: string, userId: string): Promise<void>;
}
