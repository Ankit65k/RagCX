import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentLifecycleService } from '../services/document-lifecycle.service.js';
import { StateTransitionValidator } from '../services/state-transition-validator.js';
import { documentRepository } from '../controllers/dependencies.js';
import { storageProvider } from '../../../infrastructure/storage/storage.factory.js';
import { eventBus } from '../../../infrastructure/redis/event-bus/index.js';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import {
  DocumentAlreadyDeletedError,
  DocumentAlreadyProcessingError,
  DocumentRestoreError,
  ReprocessNotAllowedError,
} from '../errors/lifecycle.errors.js';
import { InvalidDocumentStateError } from '../errors/document-service.errors.js';

vi.mock('../controllers/dependencies.js', () => {
  return {
    documentRepository: {
      findDocumentByIdOrThrow: vi.fn(),
      updateDocument: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      deleteDocument: vi.fn(),
    },
  };
});

vi.mock('../../../infrastructure/storage/storage.factory.js', () => {
  return {
    storageProvider: {
      delete: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
    },
  };
});

vi.mock('../../../infrastructure/redis/event-bus/index.js', () => {
  return {
    eventBus: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('DocumentLifecycle & State Machine Test Suite', () => {
  let lifecycleService: DocumentLifecycleService;
  let validator: StateTransitionValidator;

  const mockDoc = {
    id: 'd-123',
    originalFileName: 'doc.pdf',
    storedFileName: 'stored-doc.pdf',
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.PENDING,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lifecycleService = new DocumentLifecycleService();
    validator = new StateTransitionValidator();
  });

  describe('State Machine Transitions', () => {
    it('should permit valid transitions', () => {
      // UPLOADED -> DELETED (Soft delete on a queued/idle document)
      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.UPLOADED, processingStatus: ProcessingStatus.PENDING },
          'DELETED',
          'd-123',
        ),
      ).not.toThrow();

      // DELETED -> UPLOADED (Restore a soft deleted document)
      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.DELETED, processingStatus: ProcessingStatus.FAILED },
          'UPLOADED',
          'd-123',
        ),
      ).not.toThrow();
    });

    it('should throw DocumentAlreadyProcessingError if deleting active processing file', () => {
      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.UPLOADED, processingStatus: ProcessingStatus.PROCESSING },
          'DELETED',
          'd-123',
        ),
      ).toThrow(DocumentAlreadyProcessingError);
    });

    it('should throw DocumentAlreadyDeletedError if double deleting', () => {
      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.DELETED, processingStatus: ProcessingStatus.FAILED },
          'DELETED',
          'd-123',
        ),
      ).toThrow(DocumentAlreadyDeletedError);
    });

    it('should throw ReprocessNotAllowedError if reprocessing uploading or deleted files', () => {
      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.DELETED, processingStatus: ProcessingStatus.FAILED },
          'REPROCESSING',
          'd-123',
        ),
      ).toThrow(ReprocessNotAllowedError);

      expect(() =>
        validator.validateTransition(
          { uploadStatus: UploadStatus.UPLOADING, processingStatus: ProcessingStatus.PENDING },
          'REPROCESSING',
          'd-123',
        ),
      ).toThrow(ReprocessNotAllowedError);
    });
  });

  describe('DocumentLifecycleService Operations', () => {
    it('should successfully softDelete, removing physical file and publishing event', async () => {
      vi.mocked(documentRepository.findDocumentByIdOrThrow).mockResolvedValue(mockDoc as any);
      vi.mocked(documentRepository.softDelete).mockResolvedValue({
        ...mockDoc,
        uploadStatus: UploadStatus.DELETED,
      } as any);

      const result = await lifecycleService.softDelete('d-123', 'u-1');

      expect(result.uploadStatus).toBe(UploadStatus.DELETED);
      expect(documentRepository.softDelete).toHaveBeenCalledWith('d-123');
      expect(storageProvider.delete).toHaveBeenCalledWith(mockDoc.storedFileName);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should restore a soft-deleted document back to uploaded/pending', async () => {
      const deletedDoc = {
        ...mockDoc,
        uploadStatus: UploadStatus.DELETED,
      };
      vi.mocked(documentRepository.findDocumentByIdOrThrow).mockResolvedValue(deletedDoc as any);
      vi.mocked(documentRepository.restore).mockResolvedValue({
        ...mockDoc,
        uploadStatus: UploadStatus.UPLOADED,
        processingStatus: ProcessingStatus.PENDING,
      } as any);

      const result = await lifecycleService.restore('d-123', 'u-1');

      expect(result.uploadStatus).toBe(UploadStatus.UPLOADED);
      expect(result.processingStatus).toBe(ProcessingStatus.PENDING);
      expect(documentRepository.restore).toHaveBeenCalledWith('d-123', UploadStatus.UPLOADED, ProcessingStatus.PENDING);
    });
  });
});
