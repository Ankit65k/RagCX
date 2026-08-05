import {
  Document,
  ProcessingStatus,
  UploadStatus,
  Prisma,
} from '@prisma/client';
import { PaginatedResult } from '../../../database/repositories/pagination.js';
import { TransactionClient } from '../../../database/client/transaction.js';

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'fileSize'
  | 'originalFileName';

export type SortDirection = 'asc' | 'desc';

export interface DocumentSortOptions {
  field: DocumentSortField;
  direction: SortDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentFilterOptions {
  /** Filter by one or more processing statuses. */
  processingStatus?: ProcessingStatus | ProcessingStatus[];

  /** Filter by one or more upload statuses. */
  uploadStatus?: UploadStatus | UploadStatus[];

  /** Filter by exact uploader user ID. */
  uploadedBy?: string;

  /** Filter by MIME type (e.g. "application/pdf"). */
  mimeType?: string;

  /** Return only documents created on or after this date. */
  createdAfter?: Date;

  /** Return only documents created on or before this date. */
  createdBefore?: Date;

  /** Minimum file size in bytes (inclusive). */
  minFileSize?: number;

  /** Maximum file size in bytes (inclusive). */
  maxFileSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentPaginationOptions {
  /** Page number (1-indexed). Defaults to 1. */
  page?: number;

  /** Items per page. Defaults to 20. Max 100. */
  limit?: number;

  /** Full-text search across originalFileName. */
  search?: string;

  /** Column sort options. */
  sort?: DocumentSortOptions;

  /** Field-level filters. */
  filters?: DocumentFilterOptions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Advanced query result types
// ─────────────────────────────────────────────────────────────────────────────

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDocument: Document | null;
}

export interface DocumentCountByStatus {
  status: ProcessingStatus;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `IDocumentRepository` — the full persistence contract for Document metadata.
 *
 * All methods accept an optional `tx` (Prisma transaction client) so they can
 * participate in cross-repository transactions orchestrated by the service layer.
 *
 * Return types are always typed Prisma `Document` models — never raw query
 * responses, and never untyped objects.
 */
export interface IDocumentRepository {
  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /** Persists a new document metadata record. */
  createDocument(
    data: Prisma.DocumentUncheckedCreateInput,
    tx?: TransactionClient,
  ): Promise<Document>;

  /** Updates mutable fields on an existing document. */
  updateDocument(
    id: string,
    data: Prisma.DocumentUncheckedUpdateInput,
    tx?: TransactionClient,
  ): Promise<Document>;

  /** Hard-deletes a document metadata record. Use only for admin purges. */
  deleteDocument(id: string, tx?: TransactionClient): Promise<Document>;

  // ── Lifecycle mutations ────────────────────────────────────────────────────

  /**
   * Soft-delete: marks upload status as DELETED and processing status as FAILED.
   * The physical file is removed separately by the Document Service.
   */
  softDelete(id: string, tx?: TransactionClient): Promise<Document>;

  /**
   * Restores a soft-deleted document to the specified upload / processing statuses.
   */
  restore(
    id: string,
    uploadStatus: UploadStatus,
    processingStatus: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document>;

  /**
   * Atomically updates both upload and processing status fields.
   * Pass undefined for a field to leave it unchanged.
   */
  updateStatus(
    id: string,
    uploadStatus?: UploadStatus,
    processingStatus?: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document>;

  // ── Lookups ───────────────────────────────────────────────────────────────

  /** Find by primary key (UUID). Returns null when not found. */
  findDocumentById(id: string, tx?: TransactionClient): Promise<Document | null>;

  /** Find by primary key; throws DocumentNotFoundError when absent. */
  findDocumentByIdOrThrow(id: string, tx?: TransactionClient): Promise<Document>;

  /** Find by SHA-256 checksum. Useful for duplicate detection. */
  findByChecksum(
    checksum: string,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document | null>;

  /** Find by the original client-supplied filename. */
  findByOriginalFilename(
    originalFileName: string,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document | null>;

  /** Find by the sanitised, UUID-based stored filename. */
  findByStoredFilename(
    storedFileName: string,
    tx?: TransactionClient,
  ): Promise<Document | null>;

  // ── Filtered collections ──────────────────────────────────────────────────

  /** All documents in a given processing status. */
  findByProcessingStatus(
    status: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  /** All documents in a given upload status. */
  findByUploadStatus(
    status: UploadStatus,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  /** All documents uploaded by a specific user. */
  findByUploadedUser(
    userId: string,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  // ── Paginated listing & search ────────────────────────────────────────────

  /** Full-featured paginated listing with filters, sort, and search. */
  listDocuments(
    options?: DocumentPaginationOptions,
    tx?: TransactionClient,
  ): Promise<PaginatedResult<Document>>;

  /** Total document count, optionally scoped by filter. */
  countDocuments(
    filters?: DocumentFilterOptions,
    tx?: TransactionClient,
  ): Promise<number>;

  /** Returns true when at least one document matches the given filter. */
  existsWithFilter(
    filters: DocumentFilterOptions,
    tx?: TransactionClient,
  ): Promise<boolean>;

  // ── Advanced / analytics queries ──────────────────────────────────────────

  /**
   * Duplicate-check: returns the existing document if the same checksum was
   * already uploaded by the same user.
   */
  checkDuplicate(
    checksum: string,
    uploadedBy: string,
    tx?: TransactionClient,
  ): Promise<DuplicateCheckResult>;

  /** Documents currently in the processing queue (status = PROCESSING). */
  getProcessingQueue(tx?: TransactionClient): Promise<Document[]>;

  /** Documents that failed processing, ordered oldest-first for retry. */
  getFailedDocuments(tx?: TransactionClient): Promise<Document[]>;

  /** N most recently uploaded documents, optionally scoped to a user. */
  getRecentlyUploaded(
    limit: number,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  /** Documents larger than `thresholdBytes`. */
  getLargeFiles(
    thresholdBytes: number,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  /** Documents where createdAt falls within today (UTC). */
  getUploadedToday(
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]>;

  /** Count of documents grouped by ProcessingStatus. */
  countByProcessingStatus(
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<DocumentCountByStatus[]>;
}
