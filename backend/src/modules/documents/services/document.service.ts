import { Document, ProcessingStatus, UploadStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import type { IDocumentRepository } from '../interfaces/document-repository.interface.js';
import type { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface.js';
import type {
  IDocumentService,
  UploadDocumentCommand,
} from '../interfaces/document-service.interface.js';
import type { DocumentPaginationOptions } from '../interfaces/document-repository.interface.js';
import type { PaginatedResult } from '../../../database/repositories/pagination.js';

import { RedisPublisher } from '../../../infrastructure/redis/publisher/index.js';
import { RedisEventFactory } from '../../../infrastructure/redis/events/index.js';
import { RedisChannels } from '../../../infrastructure/redis/channels/index.js';
import logger from '../../../infrastructure/logger/logger.js';

import {
  DocumentNotFoundError,
  DuplicateDocumentError,
  InvalidDocumentStateError,
  StorageFailureError,
  RedisPublishError,
  DocumentOwnershipError,
} from '../errors/document-service.errors.js';
import { DocumentRedisEvent } from '../constants/document.constants.js';
import type {
  DocumentUploadedPayload,
  DocumentDeletedPayload,
  DocumentReprocessRequestedPayload,
} from '../types/document.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Documents that may be reprocessed. PROCESSED and FAILED are valid
 * reprocess sources; UPLOADING, DELETED are not.
 */
const REPROCESSABLE_STATUSES: ReadonlySet<ProcessingStatus> = new Set([
  ProcessingStatus.COMPLETED,
  ProcessingStatus.FAILED,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DocumentService — the orchestration layer for the Document module.
 *
 * Design principles:
 *
 * 1. **Single Responsibility**: coordinates storage + DB + Redis but delegates
 *    each concern to its specialist (IStorageProvider, IDocumentRepository,
 *    RedisPublisher). Business logic lives here; I/O lives in the layers below.
 *
 * 2. **Dependency Injection via constructor**: all dependencies are injected
 *    as interface types. The service has zero hard imports of concrete classes
 *    from the repository or storage layers, keeping it independently testable.
 *
 * 3. **Compensating transactions (manual saga)**:
 *    - On upload: file is written first. If the DB write fails the service
 *      performs a compensating storage delete and re-throws.
 *    - On delete: DB soft-delete is committed first. Physical file removal and
 *      Redis event are best-effort — failures are logged but not fatal.
 *
 * 4. **Redis publish is non-blocking for deletes / reprocess**: a publish
 *    failure after a successful DB mutation logs a RedisPublishError and
 *    continues. The operation did succeed; the event is an eventual-consistency
 *    signal to the Python service.
 *
 * 5. **Ownership is enforced at service level**: controllers are dumb — they
 *    pass `req.user.id` and the service decides access.
 */
export class DocumentService implements IDocumentService {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly storageProvider: IStorageProvider,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────────────────────────────────────

  async uploadDocument(command: UploadDocumentCommand): Promise<Document> {
    const { file, uploadedBy } = command;
    const correlationId = command.correlationId ?? uuidv4();

    logger.info(
      {
        correlationId,
        uploadedBy,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        checksum: file.checksum,
      },
      'DocumentService: upload started',
    );

    // ── 1. Duplicate detection ────────────────────────────────────────────
    const { isDuplicate, existingDocument } =
      await this.documentRepository.checkDuplicate(file.checksum, uploadedBy);

    if (isDuplicate && existingDocument) {
      logger.warn(
        { correlationId, existingDocumentId: existingDocument.id },
        'DocumentService: duplicate upload rejected',
      );
      throw new DuplicateDocumentError(file.checksum, existingDocument.id);
    }

    // ── 2. Generate storage filename ─────────────────────────────────────
    const storedFilename = this.storageProvider.generateFilename(file.extension);

    // ── 3. Write file to storage ─────────────────────────────────────────
    let storageResult: { storagePath: string; storedFilename: string; checksum: string };
    try {
      storageResult = await this.storageProvider.upload(file.buffer, storedFilename);
    } catch (storageError) {
      logger.error(
        { err: storageError, correlationId },
        'DocumentService: storage upload failed',
      );
      throw new StorageFailureError(
        'Failed to write the uploaded file to storage.',
        storageError,
      );
    }

    // ── 4. Persist metadata (compensate on failure) ───────────────────────
    let document: Document;
    try {
      document = await this.documentRepository.createDocument({
        originalFileName: file.originalFilename,
        storedFileName:   storageResult.storedFilename,
        mimeType:         file.mimeType,
        fileSize:         file.fileSize,
        checksum:         storageResult.checksum,
        uploadStatus:     UploadStatus.UPLOADED,
        processingStatus: ProcessingStatus.PENDING,
        uploadedBy,
      });
    } catch (dbError) {
      // Compensate: remove the already-written file from storage.
      logger.error(
        { err: dbError, correlationId, storagePath: storageResult.storagePath },
        'DocumentService: DB save failed — compensating storage delete',
      );
      await this.storageProvider.delete(storageResult.storagePath).catch((cleanupErr) => {
        logger.error(
          { err: cleanupErr, storagePath: storageResult.storagePath },
          'DocumentService: compensating delete also failed — manual cleanup required',
        );
      });
      throw new StorageFailureError(
        'Failed to persist document metadata. The uploaded file has been removed.',
        dbError,
      );
    }

    // ── 5. Publish DOCUMENT_UPLOADED event ───────────────────────────────
    await this.publishEvent<DocumentUploadedPayload>(
      DocumentRedisEvent.DOCUMENT_UPLOADED,
      {
        documentId:       document.id,
        storagePath:      storageResult.storagePath,
        uploadedBy,
        originalFilename: file.originalFilename,
        storedFilename:   storageResult.storedFilename,
        fileSize:         file.fileSize,
        mimeType:         file.mimeType,
        checksum:         storageResult.checksum,
      },
      correlationId,
    );

    logger.info(
      { correlationId, documentId: document.id },
      'DocumentService: upload completed',
    );

    return document;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Read
  // ─────────────────────────────────────────────────────────────────────────

  async getDocument(id: string, requestedBy: string): Promise<Document> {
    const document = await this.documentRepository.findDocumentByIdOrThrow(id).catch(() => {
      throw new DocumentNotFoundError(id);
    });

    this.assertOwnership(document, requestedBy);
    return document;
  }

  async listDocuments(
    uploadedBy: string,
    options: DocumentPaginationOptions = {},
  ): Promise<PaginatedResult<Document>> {
    logger.info({ uploadedBy, options }, 'DocumentService: listDocuments');

    return this.documentRepository.listDocuments({
      ...options,
      filters: {
        ...options.filters,
        uploadedBy,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });
  }

  async searchDocuments(
    uploadedBy: string,
    options: DocumentPaginationOptions,
  ): Promise<PaginatedResult<Document>> {
    logger.info(
      { uploadedBy, search: options.search, filters: options.filters },
      'DocumentService: searchDocuments',
    );

    return this.documentRepository.listDocuments({
      ...options,
      filters: {
        ...options.filters,
        uploadedBy,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────────────────────

  async deleteDocument(id: string, deletedBy: string): Promise<void> {
    logger.info({ id, deletedBy }, 'DocumentService: delete started');

    // ── 1. Resolve and verify ─────────────────────────────────────────────
    const document = await this.documentRepository.findDocumentByIdOrThrow(id).catch(() => {
      throw new DocumentNotFoundError(id);
    });

    this.assertOwnership(document, deletedBy);
    this.assertNotDeleted(document);

    // Capture storage path before the record is mutated.
    const storagePath = document.storedFileName;

    // ── 2. Soft-delete in DB (authoritative) ──────────────────────────────
    await this.documentRepository.softDelete(id);

    // ── 3. Remove physical file (best-effort) ──────────────────────────────
    await this.storageProvider.delete(storagePath).catch((storageErr) => {
      logger.error(
        { err: storageErr, id, storagePath },
        'DocumentService: physical file delete failed — DB record already soft-deleted',
      );
    });

    // ── 4. Publish DOCUMENT_DELETED event (best-effort) ────────────────────
    await this.publishEvent<DocumentDeletedPayload>(
      DocumentRedisEvent.DOCUMENT_DELETED,
      {
        documentId:  id,
        storagePath,
        deletedBy,
        deletedAt:   new Date(),
      },
      uuidv4(),
      true, // swallowError = true
    );

    logger.info({ id, deletedBy }, 'DocumentService: delete completed');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Restore
  // ─────────────────────────────────────────────────────────────────────────

  async restoreDocument(id: string, restoredBy: string): Promise<Document> {
    logger.info({ id, restoredBy }, 'DocumentService: restore started');

    const document = await this.documentRepository.findDocumentByIdOrThrow(id).catch(() => {
      throw new DocumentNotFoundError(id);
    });

    this.assertOwnership(document, restoredBy);

    if (document.uploadStatus !== UploadStatus.DELETED) {
      throw new InvalidDocumentStateError(
        id,
        document.uploadStatus,
        UploadStatus.DELETED,
      );
    }

    const restored = await this.documentRepository.restore(
      id,
      UploadStatus.UPLOADED,
      ProcessingStatus.PENDING,
    );

    logger.info({ id, restoredBy }, 'DocumentService: restore completed');
    return restored;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reprocess
  // ─────────────────────────────────────────────────────────────────────────

  async reprocessDocument(id: string, requestedBy: string): Promise<Document> {
    logger.info({ id, requestedBy }, 'DocumentService: reprocess started');

    const document = await this.documentRepository.findDocumentByIdOrThrow(id).catch(() => {
      throw new DocumentNotFoundError(id);
    });

    this.assertOwnership(document, requestedBy);
    this.assertNotDeleted(document);

    if (!REPROCESSABLE_STATUSES.has(document.processingStatus)) {
      throw new InvalidDocumentStateError(
        id,
        document.processingStatus,
        'COMPLETED or FAILED',
      );
    }

    const updated = await this.documentRepository.updateStatus(
      id,
      UploadStatus.UPLOADED,
      ProcessingStatus.PENDING,
    );

    await this.publishEvent<DocumentReprocessRequestedPayload>(
      DocumentRedisEvent.DOCUMENT_REPROCESS_REQUESTED,
      {
        documentId:   id,
        storagePath:  document.storedFileName,
        requestedBy,
        requestedAt:  new Date(),
      },
      uuidv4(),
      true, // swallowError — reprocess UI still succeeds if Redis is temporarily down
    );

    logger.info({ id, requestedBy }, 'DocumentService: reprocess initiated');
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status update  (called by Redis subscriber / AI callback)
  // ─────────────────────────────────────────────────────────────────────────

  async updateProcessingStatus(
    id: string,
    processingStatus: ProcessingStatus,
    uploadStatus?: UploadStatus,
  ): Promise<Document> {
    logger.info(
      { id, processingStatus, uploadStatus },
      'DocumentService: updateProcessingStatus',
    );

    const exists = await this.documentRepository.findDocumentById(id);
    if (!exists) throw new DocumentNotFoundError(id);

    return this.documentRepository.updateStatus(id, uploadStatus, processingStatus);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Duplicate check
  // ─────────────────────────────────────────────────────────────────────────

  async checkDuplicate(
    checksum: string,
    uploadedBy: string,
  ): Promise<Document | null> {
    const { existingDocument } = await this.documentRepository.checkDuplicate(
      checksum,
      uploadedBy,
    );
    return existingDocument;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ownership verification  (public — usable by controllers/guards)
  // ─────────────────────────────────────────────────────────────────────────

  async verifyOwnership(documentId: string, userId: string): Promise<void> {
    const document = await this.documentRepository.findDocumentById(documentId);
    if (!document) throw new DocumentNotFoundError(documentId);
    this.assertOwnership(document, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private guards
  // ─────────────────────────────────────────────────────────────────────────

  private assertOwnership(document: Document, userId: string): void {
    if (document.uploadedBy !== userId) {
      throw new DocumentOwnershipError(document.id, userId);
    }
  }

  private assertNotDeleted(document: Document): void {
    if (document.uploadStatus === UploadStatus.DELETED) {
      throw new InvalidDocumentStateError(
        document.id,
        document.uploadStatus,
        'a non-deleted status',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Redis helper
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Publishes a typed Redis event.
   *
   * @param swallowError  When true, publish failures are logged but not re-thrown.
   *                      Use for best-effort events (delete, reprocess) where the
   *                      DB operation already committed.
   */
  private async publishEvent<T>(
    eventType: DocumentRedisEvent,
    payload: T,
    correlationId: string,
    swallowError = false,
  ): Promise<void> {
    try {
      const event = RedisEventFactory.createEvent<T>(eventType, payload, correlationId);
      await RedisPublisher.publish(RedisChannels.DOCUMENT_JOBS, event);

      logger.debug(
        { eventType, correlationId },
        'DocumentService: Redis event published',
      );
    } catch (redisError) {
      const wrapped = new RedisPublishError(eventType, redisError);

      if (swallowError) {
        logger.warn(
          { err: redisError, eventType, correlationId },
          'DocumentService: Redis publish failed (non-fatal)',
        );
        return;
      }

      logger.error(
        { err: redisError, eventType, correlationId },
        'DocumentService: Redis publish failed (fatal)',
      );
      throw wrapped;
    }
  }
}

export default DocumentService;
