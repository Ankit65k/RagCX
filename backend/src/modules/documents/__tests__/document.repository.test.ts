import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentRepository } from '../repositories/document.repository.js';
import { prisma } from '../../../database/client/index.js';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import { DatabaseError, DocumentNotFoundError } from '../errors/document-repository.errors.js';

vi.mock('../../../database/client/index.js', () => {
  const mockPrisma = {
    document: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  };
  return {
    prisma: mockPrisma,
  };
});

describe('DocumentRepository Test Suite', () => {
  let repository: DocumentRepository;
  const mockDoc = {
    id: 'd-123',
    originalFileName: 'test.pdf',
    storedFileName: 'stored-test.pdf',
    checksum: 'checksum-123',
    mimeType: 'application/pdf',
    fileSize: 1024,
    totalPages: 10,
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.PENDING,
    uploadedBy: 'u-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DocumentRepository();
  });

  describe('Create', () => {
    it('should create document record successfully', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(mockDoc);

      const result = await repository.createDocument({
        originalFileName: mockDoc.originalFileName,
        storedFileName: mockDoc.storedFileName,
        checksum: mockDoc.checksum,
        mimeType: mockDoc.mimeType,
        fileSize: mockDoc.fileSize,
        uploadedBy: mockDoc.uploadedBy,
      });

      expect(result).toEqual(mockDoc);
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          originalFileName: mockDoc.originalFileName,
          storedFileName: mockDoc.storedFileName,
          checksum: mockDoc.checksum,
          mimeType: mockDoc.mimeType,
          fileSize: mockDoc.fileSize,
          uploadedBy: mockDoc.uploadedBy,
        },
      });
    });

    it('should wrap database errors in DatabaseError', async () => {
      vi.mocked(prisma.document.create).mockRejectedValue(new Error('DB connection lost'));

      await expect(
        repository.createDocument({
          originalFileName: 'test.pdf',
          storedFileName: 'stored.pdf',
          mimeType: 'application/pdf',
          fileSize: 100,
          uploadedBy: 'user-1',
        }),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('Retrieve & Find', () => {
    it('should retrieve a document by id or throw DocumentNotFoundError', async () => {
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDoc);

      const doc = await repository.findDocumentByIdOrThrow('d-123');
      expect(doc).toEqual(mockDoc);

      vi.mocked(prisma.document.findUnique).mockResolvedValue(null);
      await expect(repository.findDocumentByIdOrThrow('d-123')).rejects.toThrow(DocumentNotFoundError);
    });
  });

  describe('Soft Delete & Restore', () => {
    it('should perform soft delete successfully', async () => {
      const softDeletedDoc = {
        ...mockDoc,
        uploadStatus: UploadStatus.DELETED,
        processingStatus: ProcessingStatus.FAILED,
      };
      vi.mocked(prisma.document.update).mockResolvedValue(softDeletedDoc);

      const result = await repository.softDelete('d-123');
      expect(result.uploadStatus).toBe(UploadStatus.DELETED);
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'd-123' },
        data: {
          uploadStatus: UploadStatus.DELETED,
          processingStatus: ProcessingStatus.FAILED,
        },
      });
    });

    it('should restore metadata successfully', async () => {
      const restoredDoc = {
        ...mockDoc,
        uploadStatus: UploadStatus.UPLOADED,
        processingStatus: ProcessingStatus.PENDING,
      };
      vi.mocked(prisma.document.update).mockResolvedValue(restoredDoc);

      const result = await repository.restore('d-123', UploadStatus.UPLOADED, ProcessingStatus.PENDING);
      expect(result.uploadStatus).toBe(UploadStatus.UPLOADED);
      expect(result.processingStatus).toBe(ProcessingStatus.PENDING);
    });
  });

  describe('Paginated listDocuments & Search', () => {
    it('should support page, limit, searching, and filtering', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(1);
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDoc]);

      const result = await repository.listDocuments({
        page: 1,
        limit: 10,
        search: 'test',
        filters: {
          mimeType: 'application/pdf',
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.itemsPerPage).toBe(10);
      expect(prisma.document.findMany).toHaveBeenCalled();
    });
  });
});
