/**
 * Repository-layer type definitions for the Document module.
 *
 * These types are intentionally separate from domain types (document.types.ts)
 * because they describe *query parameters*, not *domain models*.
 */

import { ProcessingStatus, UploadStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports (keep import surface minimal for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export { ProcessingStatus, UploadStatus };

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Columns that the listing endpoint supports sorting by.
 * Backed by `SORT_FIELD_MAP` in the query builder.
 */
export type DocumentSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'fileSize'
  | 'originalFileName';

export type SortDirection = 'asc' | 'desc';

export interface DocumentSortOptions {
  field:     DocumentSortField;
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

  /** Filter by exact uploader user ID (UUID). */
  uploadedBy?: string;

  /** Filter by MIME type. */
  mimeType?: string;

  /** Return only documents created on or after this date (inclusive). */
  createdAfter?: Date;

  /** Return only documents created on or before this date (inclusive). */
  createdBefore?: Date;

  /** Minimum file size in bytes (inclusive). */
  minFileSize?: number;

  /** Maximum file size in bytes (inclusive). */
  maxFileSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination request
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentPaginationOptions {
  /** 1-indexed page number. Defaults to 1. */
  page?: number;

  /** Items per page. Clamped to [1, 100]. Defaults to 20. */
  limit?: number;

  /** Case-insensitive substring search against originalFileName. */
  search?: string;

  sort?: DocumentSortOptions;
  filters?: DocumentFilterOptions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Advanced query results
// ─────────────────────────────────────────────────────────────────────────────

export interface DuplicateCheckResult {
  /** True when an identical checksum already exists for this user. */
  isDuplicate: boolean;

  /** The conflicting document, or null when no duplicate was found. */
  existingDocument: import('@prisma/client').Document | null;
}

export interface DocumentCountByStatus {
  status: ProcessingStatus;
  count:  number;
}
