import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '../services/document.service.js';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import { eventBus } from '../../../infrastructure/redis/event-bus/event-bus.js';
import { RedisPublisher } from '../../../infrastructure/redis/publisher/index.js';
import { DuplicateDocumentError, DocumentNotFoundError, InvalidDocumentStateError } from '../errors/document-service.errors.js';

// Mocks
const mockRepository = {
  checkDuplicate: vi.fn(),
  createDocument: vi.fn(),
  findDocumentByIdOrThrow: vi.fn(),
  findDocumentById: vi.fn(),
  updateStatus: vi.fn(),
  updateDocument: vi.fn(),
  softDelete: vi.fn(),
  restore: vi.fn(),
  listDocuments: vi.fn(),
};

const mockStorageProvider = {
  upload: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn(),
  read: vi.fn(),
  generateFilename: vi.fn().mockReturnValue('stored-document.pdf'),
};

vi.mock('../../../infrastructure/redis/event-bus/event-bus.js', () => {
  return {
    eventBus: {
      publish: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../../../infrastructure/redis/publisher/index.js', () => {
  return {
    RedisPublisher: {
      publish: vi.fn().mockResolvedValue(1),
    },
    default: {
      publish: vi.fn().mockResolvedValue(1),
    },
  };
});

describe('DocumentService Test Suite', () => {
  let service: DocumentService;

  const mockDoc = {
    id: 'doc-123',
    originalFileName: 'document.pdf',
    storedFileName: 'stored-document.pdf',
    checksum: 'hash-123',
    mimeType: 'application/pdf',
    fileSize: 2048,
    totalPages: 0,
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.PENDING,
    uploadedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const uploadCommand = {
    file: {
      originalFilename: 'document.pdf',
      storedFilename: '',
      mimeType: 'application/pdf',
      extension: '.pdf',
      fileSize: 2048,
      storagePath: '',
      checksum: 'hash-123',
      buffer: Buffer.from('mock pdf'),
    },
    uploadedBy: 'user-123',
    correlationId: 'corr-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentService(mockRepository as any, mockStorageProvider as any);
  });

  describe('Upload', () => {
    it('should successfully orchestrate a file upload', async () => {
      mockRepository.checkDuplicate.mockResolvedValue({ isDuplicate: false, existingDocument: null });
      mockStorageProvider.upload.mockResolvedValue({
        originalFilename: 'document.pdf',
        storedFilename: 'stored-document.pdf',
        mimeType: 'application/pdf',
        extension: '.pdf',
        fileSize: 2048,
        storagePath: '/path/to/stored-document.pdf',
      });
      mockRepository.createDocument.mockResolvedValue(mockDoc);

      const result = await service.uploadDocument(uploadCommand);

      expect(result).toEqual(mockDoc);
      expect(mockRepository.checkDuplicate).toHaveBeenCalledWith(uploadCommand.file.checksum, uploadCommand.uploadedBy);
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(uploadCommand.file.buffer, 'stored-document.pdf');
      expect(mockRepository.createDocument).toHaveBeenCalled();
      expect(RedisPublisher.publish).toHaveBeenCalled();
    });

    it('should throw DuplicateDocumentError if checksum already exists for user', async () => {
      mockRepository.checkDuplicate.mockResolvedValue({ isDuplicate: true, existingDocument: mockDoc });

      await expect(service.uploadDocument(uploadCommand)).rejects.toThrow(DuplicateDocumentError);
      expect(mockStorageProvider.upload).not.toHaveBeenCalled();
    });

    it('should run compensating deletion if repository creation fails', async () => {
      mockRepository.checkDuplicate.mockResolvedValue({ isDuplicate: false, existingDocument: null });
      mockStorageProvider.upload.mockResolvedValue({
        originalFilename: 'document.pdf',
        storedFilename: 'stored-document.pdf',
        mimeType: 'application/pdf',
        extension: '.pdf',
        fileSize: 2048,
        storagePath: '/path/to/stored-document.pdf',
      });
      mockRepository.createDocument.mockRejectedValue(new Error('Database write failure'));

      await expect(service.uploadDocument(uploadCommand)).rejects.toThrow('Failed to persist document metadata');
      expect(mockStorageProvider.delete).toHaveBeenCalledWith('/path/to/stored-document.pdf');
    });
  });

  describe('Delete', () => {
    it('should soft delete and clean storage successfully', async () => {
      mockRepository.findDocumentByIdOrThrow.mockResolvedValue(mockDoc);
      mockRepository.softDelete.mockResolvedValue({
        ...mockDoc,
        uploadStatus: UploadStatus.DELETED,
      });

      await service.deleteDocument('doc-123', 'user-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('doc-123');
      expect(mockStorageProvider.delete).toHaveBeenCalledWith(mockDoc.storedFileName);
      expect(RedisPublisher.publish).toHaveBeenCalled();
    });

    it('should throw DocumentNotFoundError if deleting non-existent record', async () => {
      mockRepository.findDocumentByIdOrThrow.mockRejectedValue(new Error('Not found'));

      await expect(service.deleteDocument('doc-999', 'user-123')).rejects.toThrow(DocumentNotFoundError);
    });
  });

  describe('Reprocess', () => {
    it('should reset metadata and initiate reprocessing successfully', async () => {
      const processedDoc = {
        ...mockDoc,
        processingStatus: ProcessingStatus.COMPLETED,
      };
      mockRepository.findDocumentByIdOrThrow.mockResolvedValue(processedDoc);
      mockRepository.updateStatus.mockResolvedValue({
        ...processedDoc,
        processingStatus: ProcessingStatus.PENDING,
      });

      const result = await service.reprocessDocument('doc-123', 'user-123');

      expect(result.processingStatus).toBe(ProcessingStatus.PENDING);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('doc-123', UploadStatus.UPLOADED, ProcessingStatus.PENDING);
      expect(RedisPublisher.publish).toHaveBeenCalled();
    });

    it('should throw InvalidDocumentStateError if reprocessing deleted or active document', async () => {
      const deletedDoc = {
        ...mockDoc,
        uploadStatus: UploadStatus.DELETED,
      };
      mockRepository.findDocumentByIdOrThrow.mockResolvedValue(deletedDoc);

      await expect(service.reprocessDocument('doc-123', 'user-123')).rejects.toThrow(InvalidDocumentStateError);
    });
  });
});
