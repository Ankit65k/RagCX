import { ProcessingStatus, UploadStatus } from '@prisma/client';
import type {
  DocumentPaginationOptions,
  DocumentSortField,
  SortDirection,
} from '../../interfaces/document-repository.interface.js';

/**
 * Parses raw Express query parameters into strongly-typed DocumentPaginationOptions.
 * Enforces boundaries (min/max page/limit) and validates sorting/filtering enums.
 */
export function parsePaginationQuery(query: Record<string, unknown>): DocumentPaginationOptions {
  // Page must be >= 1
  const page = query.page
    ? Math.max(1, parseInt(String(query.page), 10))
    : 1;

  // Limit must be between 1 and 100
  const limit = query.limit
    ? Math.min(100, Math.max(1, parseInt(String(query.limit), 10)))
    : 20;

  const search = query.search && typeof query.search === 'string' && query.search.trim().length > 0
    ? query.search.trim()
    : undefined;

  let sort: { field: DocumentSortField; direction: SortDirection } | undefined = undefined;

  if (query.sortBy && typeof query.sortBy === 'string') {
    const validFields: DocumentSortField[] = ['createdAt', 'updatedAt', 'fileSize', 'originalFileName'];
    const field = validFields.includes(query.sortBy as DocumentSortField)
      ? (query.sortBy as DocumentSortField)
      : 'createdAt';

    const direction: SortDirection =
      query.sortOrder === 'asc' || query.sortOrder === 'desc'
        ? query.sortOrder
        : 'desc';

    sort = { field, direction };
  }

  const filters: Record<string, unknown> = {};

  // Parse processingStatus filters
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    const validStatuses = statuses.filter((s): s is ProcessingStatus =>
      Object.values(ProcessingStatus).includes(s as ProcessingStatus),
    );

    if (validStatuses.length > 0) {
      filters.processingStatus = validStatuses.length === 1 ? validStatuses[0] : validStatuses;
    }
  }

  // Parse uploadStatus filters
  if (query.uploadStatus) {
    const uploadStatuses = Array.isArray(query.uploadStatus) ? query.uploadStatus : [query.uploadStatus];
    const validUploadStatuses = uploadStatuses.filter((s): s is UploadStatus =>
      Object.values(UploadStatus).includes(s as UploadStatus),
    );

    if (validUploadStatuses.length > 0) {
      filters.uploadStatus = validUploadStatuses.length === 1 ? validUploadStatuses[0] : validUploadStatuses;
    }
  }

  // Parse mimeType filter
  if (query.mimeType && typeof query.mimeType === 'string' && query.mimeType.trim().length > 0) {
    filters.mimeType = query.mimeType.trim();
  }

  return {
    page,
    limit,
    search,
    sort,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}
