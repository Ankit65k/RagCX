import { Document, Prisma, ProcessingStatus, UploadStatus } from '@prisma/client';

import { BaseRepository } from '../../../database/repositories/base.repository.js';
import { PaginatedResult } from '../../../database/repositories/pagination.js';
import { TransactionClient } from '../../../database/client/transaction.js';
import logger from '../../../infrastructure/logger/logger.js';

import type { IDocumentRepository } from '../interfaces/document-repository.interface.js';
import type {
  DocumentCountByStatus,
  DocumentFilterOptions,
  DocumentPaginationOptions,
  DuplicateCheckResult,
} from '../types/document-repository.types.js';
import {
  DocumentNotFoundError,
  DatabaseError,
  DuplicateDocumentError,
} from '../errors/document-repository.errors.js';
import {
  buildWhereClause,
  buildOrderByClause,
  mergeWhereClauses,
  normalisePagination,
  getTodayBounds,
} from '../utils/document-query.builder.js';

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DocumentRepository — persistence layer for Document metadata.
 *
 * Design principles:
 *
 * 1. **Transaction-safe**: every public method accepts an optional `tx`
 *    (Prisma transaction client). When `tx` is provided the method runs inside
 *    the caller's transaction; otherwise it uses the global Prisma client.
 *    This lets the service layer compose multiple repository calls atomically
 *    without the repository knowing about the surrounding business operation.
 *
 * 2. **Zero raw Prisma leakage**: all return types are `Document` (the
 *    generated Prisma model type) or domain wrapper types. Callers never
 *    receive raw query response objects.
 *
 * 3. **Centralised query building**: `buildWhereClause`, `buildOrderByClause`,
 *    and `mergeWhereClauses` (from `document-query.builder.ts`) are the single
 *    source of truth for all filter/sort logic. No where-clause is duplicated.
 *
 * 4. **Typed error wrapping**: all Prisma errors are caught and re-thrown as
 *    `DatabaseError` or domain errors (`DocumentNotFoundError`,
 *    `DuplicateDocumentError`). Service code never needs to handle Prisma
 *    error codes directly.
 *
 * 5. **Structured logging**: every mutating method and every collection query
 *    logs its entry and result at the appropriate level. File contents and
 *    user-identifying metadata (emails, IPs) are never logged.
 */
export class DocumentRepository
  extends BaseRepository<
    Document,
    Prisma.DocumentUncheckedCreateInput,
    Prisma.DocumentUncheckedUpdateInput
  >
  implements IDocumentRepository
{
  // ─── BaseRepository delegation ──────────────────────────────────────────

  protected get modelDelegate() {
    return this.db.document;
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Returns the Prisma delegate scoped to the active transaction (if any)
   * or the global client. This is the only place that resolves `tx vs db`.
   */
  private delegate(tx?: TransactionClient) {
    return tx ? tx.document : this.db.document;
  }

  /**
   * Wraps an async database call, catching Prisma errors and re-throwing
   * them as `DatabaseError` to prevent Prisma internals leaking upward.
   */
  private async runSafe<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof DocumentNotFoundError ||
        error instanceof DuplicateDocumentError ||
        error instanceof DatabaseError
      ) {
        throw error; // Already typed — propagate as-is.
      }

      throw new DatabaseError(
        `Database operation failed: ${context}.`,
        error,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async createDocument(
    data: Prisma.DocumentUncheckedCreateInput,
    tx?: TransactionClient,
  ): Promise<Document> {
    logger.info({ uploadedBy: data.uploadedBy, mimeType: data.mimeType }, 'DocumentRepository: create');

    return this.runSafe(
      () => this.delegate(tx).create({ data }),
      'createDocument',
    );
  }

  async updateDocument(
    id: string,
    data: Prisma.DocumentUncheckedUpdateInput,
    tx?: TransactionClient,
  ): Promise<Document> {
    logger.info({ id }, 'DocumentRepository: update');

    return this.runSafe(async () => {
      const doc = await this.delegate(tx).update({ where: { id }, data });
      logger.info({ id }, 'DocumentRepository: update completed');
      return doc;
    }, 'updateDocument');
  }

  async deleteDocument(id: string, tx?: TransactionClient): Promise<Document> {
    logger.info({ id }, 'DocumentRepository: hard delete');

    return this.runSafe(async () => {
      const doc = await this.delegate(tx).delete({ where: { id } });
      logger.info({ id }, 'DocumentRepository: hard delete completed');
      return doc;
    }, 'deleteDocument');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle mutations
  // ─────────────────────────────────────────────────────────────────────────

  async softDelete(id: string, tx?: TransactionClient): Promise<Document> {
    logger.info({ id }, 'DocumentRepository: soft delete');

    return this.runSafe(async () => {
      const doc = await this.delegate(tx).update({
        where: { id },
        data:  {
          uploadStatus:      UploadStatus.DELETED,
          processingStatus:  ProcessingStatus.FAILED,
        },
      });
      logger.info({ id }, 'DocumentRepository: soft delete completed');
      return doc;
    }, 'softDelete');
  }

  async restore(
    id: string,
    uploadStatus: UploadStatus,
    processingStatus: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document> {
    logger.info({ id, uploadStatus, processingStatus }, 'DocumentRepository: restore');

    return this.runSafe(async () => {
      const doc = await this.delegate(tx).update({
        where: { id },
        data:  { uploadStatus, processingStatus },
      });
      logger.info({ id }, 'DocumentRepository: restore completed');
      return doc;
    }, 'restore');
  }

  async updateStatus(
    id: string,
    uploadStatus?: UploadStatus,
    processingStatus?: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document> {
    logger.debug({ id, uploadStatus, processingStatus }, 'DocumentRepository: updateStatus');

    return this.runSafe(
      () =>
        this.delegate(tx).update({
          where: { id },
          data: {
            ...(uploadStatus     !== undefined ? { uploadStatus }     : {}),
            ...(processingStatus !== undefined ? { processingStatus } : {}),
          },
        }),
      'updateStatus',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lookups
  // ─────────────────────────────────────────────────────────────────────────

  async findDocumentById(
    id: string,
    tx?: TransactionClient,
  ): Promise<Document | null> {
    return this.runSafe(
      () => this.delegate(tx).findUnique({ where: { id } }),
      'findDocumentById',
    );
  }

  async findDocumentByIdOrThrow(
    id: string,
    tx?: TransactionClient,
  ): Promise<Document> {
    const doc = await this.findDocumentById(id, tx);
    if (!doc) throw new DocumentNotFoundError(id);
    return doc;
  }

  async findByChecksum(
    checksum: string,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document | null> {
    return this.runSafe(
      () =>
        this.delegate(tx).findFirst({
          where: {
            checksum,
            ...(uploadedBy ? { uploadedBy } : {}),
          },
        }),
      'findByChecksum',
    );
  }

  async findByOriginalFilename(
    originalFileName: string,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document | null> {
    return this.runSafe(
      () =>
        this.delegate(tx).findFirst({
          where: {
            originalFileName,
            ...(uploadedBy ? { uploadedBy } : {}),
          },
        }),
      'findByOriginalFilename',
    );
  }

  async findByStoredFilename(
    storedFileName: string,
    tx?: TransactionClient,
  ): Promise<Document | null> {
    return this.runSafe(
      () => this.delegate(tx).findFirst({ where: { storedFileName } }),
      'findByStoredFilename',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered collections
  // ─────────────────────────────────────────────────────────────────────────

  async findByProcessingStatus(
    status: ProcessingStatus,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    logger.debug({ status }, 'DocumentRepository: findByProcessingStatus');

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where:   { processingStatus: status },
          orderBy: { updatedAt: 'asc' },
        }),
      'findByProcessingStatus',
    );
  }

  async findByUploadStatus(
    status: UploadStatus,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    logger.debug({ status }, 'DocumentRepository: findByUploadStatus');

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where:   { uploadStatus: status },
          orderBy: { createdAt: 'desc' },
        }),
      'findByUploadStatus',
    );
  }

  async findByUploadedUser(
    userId: string,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    logger.debug({ userId }, 'DocumentRepository: findByUploadedUser');

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where:   { uploadedBy: userId },
          orderBy: { createdAt: 'desc' },
        }),
      'findByUploadedUser',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Paginated listing & search
  // ─────────────────────────────────────────────────────────────────────────

  async listDocuments(
    options: DocumentPaginationOptions = {},
    tx?: TransactionClient,
  ): Promise<PaginatedResult<Document>> {
    const { page, limit, skip } = normalisePagination(options.page, options.limit);

    const baseWhere   = buildWhereClause(options.filters);
    const finalWhere  = mergeWhereClauses(baseWhere, options.search);
    const orderBy     = buildOrderByClause(options.sort);

    logger.info(
      { page, limit, search: options.search, filters: options.filters },
      'DocumentRepository: listDocuments',
    );

    return this.runSafe(async () => {
      const [totalItems, items] = await Promise.all([
        this.delegate(tx).count({ where: finalWhere }),
        this.delegate(tx).findMany({
          where:   finalWhere,
          orderBy,
          take:    limit,
          skip,
        }),
      ]);

      const totalPages  = Math.max(1, Math.ceil(totalItems / limit));
      const currentPage = Math.max(1, Math.min(page, totalPages));

      logger.info(
        { totalItems, page: currentPage, returnedCount: items.length },
        'DocumentRepository: listDocuments completed',
      );

      return {
        items,
        meta: {
          totalItems,
          itemCount:    items.length,
          itemsPerPage: limit,
          totalPages,
          currentPage,
        },
      };
    }, 'listDocuments');
  }

  async countDocuments(
    filters: DocumentFilterOptions = {},
    tx?: TransactionClient,
  ): Promise<number> {
    const where = buildWhereClause(filters);
    return this.runSafe(
      () => this.delegate(tx).count({ where }),
      'countDocuments',
    );
  }

  async existsWithFilter(
    filters: DocumentFilterOptions,
    tx?: TransactionClient,
  ): Promise<boolean> {
    const count = await this.countDocuments(filters, tx);
    return count > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Advanced / analytics queries
  // ─────────────────────────────────────────────────────────────────────────

  async checkDuplicate(
    checksum: string,
    uploadedBy: string,
    tx?: TransactionClient,
  ): Promise<DuplicateCheckResult> {
    const existingDocument = await this.findByChecksum(checksum, uploadedBy, tx);

    return {
      isDuplicate:      existingDocument !== null,
      existingDocument,
    };
  }

  async getProcessingQueue(tx?: TransactionClient): Promise<Document[]> {
    logger.debug('DocumentRepository: getProcessingQueue');

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where:   { processingStatus: ProcessingStatus.PROCESSING },
          orderBy: { updatedAt: 'asc' }, // Oldest-first → FIFO
        }),
      'getProcessingQueue',
    );
  }

  async getFailedDocuments(tx?: TransactionClient): Promise<Document[]> {
    logger.debug('DocumentRepository: getFailedDocuments');

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where: {
            processingStatus: ProcessingStatus.FAILED,
            uploadStatus:     { not: UploadStatus.DELETED },
          },
          orderBy: { updatedAt: 'asc' }, // Oldest failures retry first
        }),
      'getFailedDocuments',
    );
  }

  async getRecentlyUploaded(
    limit: number,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where: {
            uploadStatus: UploadStatus.UPLOADED,
            ...(uploadedBy ? { uploadedBy } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take:    safeLimit,
        }),
      'getRecentlyUploaded',
    );
  }

  async getLargeFiles(
    thresholdBytes: number,
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where: {
            fileSize:     { gt: thresholdBytes },
            uploadStatus: { not: UploadStatus.DELETED },
            ...(uploadedBy ? { uploadedBy } : {}),
          },
          orderBy: { fileSize: 'desc' },
        }),
      'getLargeFiles',
    );
  }

  async getUploadedToday(
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<Document[]> {
    const { startOfDay, endOfDay } = getTodayBounds();

    return this.runSafe(
      () =>
        this.delegate(tx).findMany({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            ...(uploadedBy ? { uploadedBy } : {}),
          },
          orderBy: { createdAt: 'desc' },
        }),
      'getUploadedToday',
    );
  }

  async countByProcessingStatus(
    uploadedBy?: string,
    tx?: TransactionClient,
  ): Promise<DocumentCountByStatus[]> {
    return this.runSafe(async () => {
      // Prisma does not yet support groupBy via the delegate proxy shape,
      // so we use the raw client (or tx client) directly.
      const client = tx ?? this.db;
      const rows = await client.document.groupBy({
        by:    ['processingStatus'],
        where: uploadedBy ? { uploadedBy } : undefined,
        _count: { id: true },
      });

      return rows.map((row) => ({
        status: row.processingStatus,
        count:  row._count.id,
      }));
    }, 'countByProcessingStatus');
  }
}

export default DocumentRepository;
