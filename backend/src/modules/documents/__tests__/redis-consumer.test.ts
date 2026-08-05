import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisConsumer } from '../../../infrastructure/redis/event-consumer/consumers/redis.consumer.js';
import { DocumentEventConsumer } from '../../../infrastructure/redis/event-consumer/consumers/document-event.consumer.js';
import { MessageValidator } from '../../../infrastructure/redis/event-consumer/validators/message.validator.js';
import { RetryHandler } from '../../../infrastructure/redis/event-consumer/retry/retry.handler.js';
import { documentRepository } from '../../documents/controllers/dependencies.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import { EventValidationError, ProcessingFailedError } from '../../../infrastructure/redis/event-consumer/errors/event-consumer.errors.js';
import { EventFactory } from '../../../infrastructure/redis/event-bus/utils/event-factory.util.js';

vi.mock('../../../infrastructure/redis/client/index.js', () => {
  const mockClient = {
    isOpen: true,
    set: vi.fn(),
    duplicate: vi.fn().mockReturnValue({
      connect: vi.fn(),
      on: vi.fn(),
      subscribe: vi.fn(),
    }),
  };
  return {
    getRedisClient: () => mockClient,
  };
});

vi.mock('../../documents/controllers/dependencies.js', () => {
  return {
    documentRepository: {
      findDocumentByIdOrThrow: vi.fn(),
      updateStatus: vi.fn(),
      updateDocument: vi.fn(),
    },
  };
});

describe('RedisConsumer & Handlers Test Suite', () => {
  const mockRedis = getRedisClient();

  const mockDoc = {
    id: 'd-123',
    originalFileName: 'doc.pdf',
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.PENDING,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.isOpen = true;
  });

  describe('MessageValidator', () => {
    it('should validate envelope and payload correctly', () => {
      const event = EventFactory.create('DOCUMENT_PROCESSING_STARTED', { documentId: 'd-123' }, {
        correlationId: 'c-1',
        requestId: 'r-1',
      });
      expect(() => MessageValidator.validate(event)).not.toThrow();
    });

    it('should throw EventValidationError if documentId is missing', () => {
      const event = EventFactory.create('DOCUMENT_PROCESSING_STARTED', { doc: 'missing' }, {
        correlationId: 'c-1',
        requestId: 'r-1',
      });
      expect(() => MessageValidator.validate(event)).toThrow(EventValidationError);
    });
  });

  describe('Idempotency Check', () => {
    it('should allow processing of new events and reject duplicates', async () => {
      const consumer = new RedisConsumer();
      
      // 1. First set: returns OK (success)
      vi.mocked(mockRedis.set).mockResolvedValue('OK');
      const isDuplicate1 = await (consumer as any).checkIdempotency('evt-1');
      expect(isDuplicate1).toBe(false);

      // 2. Second set: returns null (already exists)
      vi.mocked(mockRedis.set).mockResolvedValue(null);
      const isDuplicate2 = await (consumer as any).checkIdempotency('evt-1');
      expect(isDuplicate2).toBe(true);
    });
  });

  describe('RetryHandler', () => {
    it('should retry operation and eventually return result', async () => {
      const callback = vi.fn()
        .mockRejectedValueOnce(new Error('Locked DB'))
        .mockResolvedValue('DB Success');

      const result = await RetryHandler.execute(callback, 'test-query', 3, 5);
      expect(result).toBe('DB Success');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Document Processing Event Handlers', () => {
    it('should handle DOCUMENT_PROCESSING_STARTED successfully', async () => {
      const handler = DocumentEventConsumer.getStartedHandler();
      const event = EventFactory.create('DOCUMENT_PROCESSING_STARTED', {
        documentId: 'd-123',
        startedAt: new Date().toISOString(),
      }, { correlationId: 'c-1', requestId: 'r-1' });

      vi.mocked(documentRepository.findDocumentByIdOrThrow).mockResolvedValue(mockDoc as any);
      vi.mocked(documentRepository.updateStatus).mockResolvedValue(mockDoc as any);

      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(documentRepository.findDocumentByIdOrThrow).toHaveBeenCalledWith('d-123');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('d-123', undefined, ProcessingStatus.PROCESSING);
    });

    it('should handle DOCUMENT_PROCESSING_COMPLETED successfully, updating pages count', async () => {
      const handler = DocumentEventConsumer.getCompletedHandler();
      const event = EventFactory.create('DOCUMENT_PROCESSING_COMPLETED', {
        documentId: 'd-123',
        processingStatus: 'COMPLETED',
        pageCount: 15,
        chunkCount: 120,
        embeddingCount: 120,
        processingTime: 1200,
      }, { correlationId: 'c-1', requestId: 'r-1' });

      vi.mocked(documentRepository.findDocumentByIdOrThrow).mockResolvedValue(mockDoc as any);
      vi.mocked(documentRepository.updateDocument).mockResolvedValue(mockDoc as any);

      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(documentRepository.updateDocument).toHaveBeenCalledWith('d-123', {
        totalPages: 15,
        processingStatus: ProcessingStatus.COMPLETED,
      });
    });

    it('should handle DOCUMENT_PROCESSING_FAILED, transitioning state to FAILED', async () => {
      const handler = DocumentEventConsumer.getFailedHandler();
      const event = EventFactory.create('DOCUMENT_PROCESSING_FAILED', {
        documentId: 'd-123',
        processingStatus: 'FAILED',
        reason: 'Corrupt PDF',
        failedAt: new Date().toISOString(),
      }, { correlationId: 'c-1', requestId: 'r-1' });

      vi.mocked(documentRepository.findDocumentByIdOrThrow).mockResolvedValue(mockDoc as any);
      vi.mocked(documentRepository.updateStatus).mockResolvedValue(mockDoc as any);

      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('d-123', undefined, ProcessingStatus.FAILED);
    });
  });
});
