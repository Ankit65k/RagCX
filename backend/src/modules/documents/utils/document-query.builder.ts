import { Prisma, ProcessingStatus, UploadStatus } from '@prisma/client';
import type {
  DocumentFilterOptions,
  DocumentSortField,
  DocumentSortOptions,
  SortDirection,
} from '../types/document-repository.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

/**
 * Maps domain sort-field names to Prisma `orderBy` clause shapes.
 * Adding a new sortable column only requires an entry here.
 */
const SORT_FIELD_MAP: Record<
  DocumentSortField,
  keyof Prisma.DocumentOrderByWithRelationInput
> = {
  createdAt:        'createdAt',
  updatedAt:        'updatedAt',
  fileSize:         'fileSize',
  originalFileName: 'originalFileName',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a Prisma `where` clause from domain-level filter options.
 *
 * Centralising this logic prevents duplicated where-clause construction
 * across find methods, and makes adding a new filter a one-line change.
 */
export const buildWhereClause = (
  filters: DocumentFilterOptions = {},
): Prisma.DocumentWhereInput => {
  const where: Prisma.DocumentWhereInput = {};

  // Processing status — supports single value or array (IN query)
  if (filters.processingStatus !== undefined) {
    where.processingStatus = Array.isArray(filters.processingStatus)
      ? { in: filters.processingStatus }
      : filters.processingStatus;
  }

  // Upload status — supports single value or array (IN query)
  if (filters.uploadStatus !== undefined) {
    where.uploadStatus = Array.isArray(filters.uploadStatus)
      ? { in: filters.uploadStatus }
      : filters.uploadStatus;
  }

  if (filters.uploadedBy) {
    where.uploadedBy = filters.uploadedBy;
  }

  if (filters.mimeType) {
    where.mimeType = filters.mimeType;
  }

  // Date range filter
  if (filters.createdAfter || filters.createdBefore) {
    where.createdAt = {
      ...(filters.createdAfter  ? { gte: filters.createdAfter  } : {}),
      ...(filters.createdBefore ? { lte: filters.createdBefore } : {}),
    };
  }

  // File size range
  if (filters.minFileSize !== undefined || filters.maxFileSize !== undefined) {
    where.fileSize = {
      ...(filters.minFileSize !== undefined ? { gte: filters.minFileSize } : {}),
      ...(filters.maxFileSize !== undefined ? { lte: filters.maxFileSize } : {}),
    };
  }

  return where;
};

/**
 * Builds a search predicate that performs a case-insensitive prefix/substring
 * match on `originalFileName`.
 *
 * Merged via `AND` with the base where clause in `buildWhereClause` callers.
 */
export const buildSearchClause = (
  search: string,
): Prisma.DocumentWhereInput => ({
  originalFileName: {
    contains: search.trim(),
    mode:     Prisma.QueryMode.insensitive,
  },
});

/**
 * Merges a base filter where-clause with an optional full-text search predicate.
 *
 * When both are present, they are combined with an implicit AND.
 */
export const mergeWhereClauses = (
  base: Prisma.DocumentWhereInput,
  search?: string,
): Prisma.DocumentWhereInput => {
  if (!search || search.trim().length === 0) return base;

  const searchClause = buildSearchClause(search);

  // Both conditions must be satisfied → wrap in AND
  return { AND: [base, searchClause] };
};

/**
 * Converts domain sort options into a Prisma `orderBy` array.
 * Falls back to `createdAt desc` when no sort is specified.
 */
export const buildOrderByClause = (
  sort?: DocumentSortOptions,
): Prisma.DocumentOrderByWithRelationInput[] => {
  const field: DocumentSortField = sort?.field     ?? 'createdAt';
  const dir:   SortDirection     = sort?.direction ?? 'desc';

  const prismaField = SORT_FIELD_MAP[field];

  return [{ [prismaField]: dir }];
};

/**
 * Clamps and normalises page / limit inputs.
 *
 * @returns `{ page, limit, skip }` — all safe to pass directly to Prisma.
 */
export const normalisePagination = (
  rawPage?:  number,
  rawLimit?: number,
): { page: number; limit: number; skip: number } => {
  const page  = Math.max(DEFAULT_PAGE,  Math.floor(rawPage  ?? DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit ?? DEFAULT_LIMIT)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Generates a UTC midnight timestamp for "start of today" and
 * a UTC 23:59:59 timestamp for "end of today", used by `getUploadedToday`.
 */
export const getTodayBounds = (): { startOfDay: Date; endOfDay: Date } => {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const endOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  return { startOfDay, endOfDay };
};

// Re-export Prisma enums so callers import from one place.
export { ProcessingStatus, UploadStatus };
