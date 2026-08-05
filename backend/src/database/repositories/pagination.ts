import { PaginationMeta } from '../../common/responses/api-response.js';

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export const calculatePagination = (
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.max(1, Math.min(page, totalPages));

  return {
    totalItems,
    itemCount: Math.min(limit, totalItems),
    itemsPerPage: limit,
    totalPages,
    currentPage,
  };
};
