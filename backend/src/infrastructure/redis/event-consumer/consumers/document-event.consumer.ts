import { ProcessingStatus } from '@prisma/client';
import { BusEvent } from '../../event-bus/interfaces/event-bus.interface.js';
import { logger } from '../../../logger/logger.js';
import { documentRepository } from '../../../../modules/documents/controllers/dependencies.js';
import { ProcessingFailedError } from '../errors/event-consumer.errors.js';
import type {
  IEventHandler,
  DocumentProcessingStartedPayload,
  DocumentProcessingCompletedPayload,
  DocumentProcessingFailedPayload,
} from '../interfaces/event-consumer.interface.js';

/**
 * `DocumentEventConsumer` — implements handlers for Document Processing Lifecycle events.
 *
 * Implements:
 * - DOCUMENT_PROCESSING_STARTED
 * - DOCUMENT_PROCESSING_COMPLETED
 * - DOCUMENT_PROCESSING_FAILED
 */
export class DocumentEventConsumer {
  // ─── 1. DOCUMENT_PROCESSING_STARTED ───────────────────────────────────────
  
  static getStartedHandler(): IEventHandler<DocumentProcessingStartedPayload> {
    return {
      handle: async (event: BusEvent<DocumentProcessingStartedPayload>): Promise<void> => {
        const { documentId, startedAt } = event.payload;

        logger.info(
          { documentId, startedAt, eventId: event.eventId, correlationId: event.correlationId },
          'DocumentEventConsumer: processing started received',
        );

        try {
          await documentRepository.findDocumentByIdOrThrow(documentId);

          await documentRepository.updateStatus(
            documentId,
            undefined,
            ProcessingStatus.PROCESSING,
          );

          logger.info(
            { documentId, startedAt, correlationId: event.correlationId },
            'DOCUMENT_PROCESSING_STARTED: successfully processed state update',
          );
        } catch (error) {
          throw new ProcessingFailedError(
            event.eventId,
            event.eventType,
            `Failed to start processing: ${(error as Error).message}`,
            error,
          );
        }
      },
    };
  }

  // ─── 2. DOCUMENT_PROCESSING_COMPLETED ─────────────────────────────────────

  static getCompletedHandler(): IEventHandler<DocumentProcessingCompletedPayload> {
    return {
      handle: async (event: BusEvent<DocumentProcessingCompletedPayload>): Promise<void> => {
        const {
          documentId,
          pageCount,
          chunkCount,
          embeddingCount,
          processingTime,
          metadata,
        } = event.payload;

        logger.info(
          { documentId, pageCount, eventId: event.eventId, correlationId: event.correlationId },
          'DocumentEventConsumer: processing completed received',
        );

        try {
          await documentRepository.findDocumentByIdOrThrow(documentId);

          // Update total pages and status inside the database
          await documentRepository.updateDocument(documentId, {
            totalPages:       pageCount,
            processingStatus: ProcessingStatus.COMPLETED,
          });

          // Audit Log fields that do not exist in the database model
          logger.info(
            {
              documentId,
              correlationId:  event.correlationId,
              requestId:      event.requestId,
              pageCount,
              chunkCount,      // AI Service Chunk Count audit log
              embeddingCount,  // AI Service Embedding Count audit log
              processingTime,  // Processing time in ms audit log
              aiMetadata:     metadata ?? {}, // Optional AI Metadata audit log
              completedAt:    new Date().toISOString(),
            },
            'DOCUMENT_PROCESSING_COMPLETED AUDIT LOG: document parsing and vectorisation successful',
          );
        } catch (error) {
          throw new ProcessingFailedError(
            event.eventId,
            event.eventType,
            `Failed to complete processing: ${(error as Error).message}`,
            error,
          );
        }
      },
    };
  }

  // ─── 3. DOCUMENT_PROCESSING_FAILED ────────────────────────────────────────

  static getFailedHandler(): IEventHandler<DocumentProcessingFailedPayload> {
    return {
      handle: async (event: BusEvent<DocumentProcessingFailedPayload>): Promise<void> => {
        const { documentId, reason, failedAt, retryCount = 0 } = event.payload;

        logger.info(
          { documentId, reason, eventId: event.eventId, correlationId: event.correlationId },
          'DocumentEventConsumer: processing failed received',
        );

        try {
          await documentRepository.findDocumentByIdOrThrow(documentId);

          await documentRepository.updateStatus(
            documentId,
            undefined,
            ProcessingStatus.FAILED,
          );

          // Audit log failure reason and retry history
          logger.error(
            {
              documentId,
              correlationId: event.correlationId,
              requestId:     event.requestId,
              failedAt,
              reason,        // Failure reason audit log
              retryCount,    // AI Pipeline Retry Count audit log
            },
            'DOCUMENT_PROCESSING_FAILED AUDIT LOG: document processing failed on AI Service side',
          );
        } catch (error) {
          throw new ProcessingFailedError(
            event.eventId,
            event.eventType,
            `Failed to record processing failure: ${(error as Error).message}`,
            error,
          );
        }
      },
    };
  }
}
