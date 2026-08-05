import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../../../infrastructure/redis/event-bus/event-bus.js';
import { EventFactory } from '../../../infrastructure/redis/event-bus/utils/event-factory.util.js';
import { RedisEventValidator } from '../../../infrastructure/redis/event-bus/utils/event-validator.util.js';
import { RedisEventSerializer } from '../../../infrastructure/redis/event-bus/utils/event-serializer.util.js';
import { CorrelationIdGenerator } from '../../../infrastructure/redis/event-bus/utils/correlation-id.util.js';
import { RedisPublisher } from '../../../infrastructure/redis/event-bus/publisher/redis-publisher.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { EventValidationError, PublishFailedError, SerializationError } from '../../../infrastructure/redis/event-bus/errors/event-bus.errors.js';

vi.mock('../../../infrastructure/redis/client/index.js', () => {
  const mockClient = {
    isOpen: true,
    publish: vi.fn().mockResolvedValue(1),
    connect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getRedisClient: () => mockClient,
  };
});

describe('EventBus & Publisher Test Suite', () => {
  const mockClient = getRedisClient();

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.isOpen = true;
  });

  describe('Correlation & Request IDs', () => {
    it('should generate valid RFC-4122 v4 UUIDs', () => {
      const cid = CorrelationIdGenerator.generateCorrelationId();
      const eid = CorrelationIdGenerator.generateEventId();
      expect(cid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(eid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should resolve a request ID or fallback to generating a new one', () => {
      expect(CorrelationIdGenerator.resolveRequestId('custom-req')).toBe('custom-req');
      expect(CorrelationIdGenerator.resolveRequestId('')).not.toBe('');
      expect(CorrelationIdGenerator.resolveRequestId(undefined)).toBeDefined();
    });
  });

  describe('EventFactory', () => {
    it('should create a frozen, valid event envelope', () => {
      const payload = { documentId: 'doc-123', originalFilename: 'test.pdf' };
      const event = EventFactory.create('DOCUMENT_UPLOADED', payload, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });

      expect(event.eventType).toBe('DOCUMENT_UPLOADED');
      expect(event.payload).toEqual(payload);
      expect(event.correlationId).toBe('c-123');
      expect(event.requestId).toBe('r-123');
      expect(event.version).toBe('1.0');
      expect(event.metadata.service).toBe('ragcx-backend');
      expect(Object.isFrozen(event)).toBe(true);
    });

    it('should clone an event with updated retryCount', () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });
      const retried = EventFactory.withRetryCount(event, 2);

      expect(retried.metadata.retryCount).toBe(2);
      expect(retried.eventId).toBe(event.eventId);
    });
  });

  describe('RedisEventSerializer', () => {
    it('should serialize and deserialize events successfully', () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });
      const serialized = RedisEventSerializer.serialize(event);
      const deserialized = RedisEventSerializer.deserialize(serialized);

      expect(deserialized).toEqual(event);
    });

    it('should throw SerializationError on invalid inputs', () => {
      expect(() => RedisEventSerializer.deserialize('invalid json')).toThrow(SerializationError);
      
      const circular: any = {};
      circular.self = circular;
      expect(() => RedisEventSerializer.serialize(circular)).toThrow(SerializationError);
    });
  });

  describe('RedisEventValidator', () => {
    it('should validate complete events successfully', () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });
      expect(() => RedisEventValidator.validate(event)).not.toThrow();
      expect(RedisEventValidator.isValid(event)).toBe(true);
    });

    it('should throw EventValidationError on missing fields', () => {
      const incompleteEvent: any = {
        eventId: '123',
        eventType: 'DOCUMENT_UPLOADED',
      };
      expect(() => RedisEventValidator.validate(incompleteEvent)).toThrow(EventValidationError);
      expect(RedisEventValidator.isValid(incompleteEvent)).toBe(false);
    });
  });

  describe('RedisPublisher Retry Logic', () => {
    it('should publish successfully on first attempt', async () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });

      await expect(eventBus.publish(event)).resolves.not.toThrow();
      expect(mockClient.publish).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failures and succeed eventually', async () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });

      vi.mocked(mockClient.publish)
        .mockRejectedValueOnce(new Error('Connection issue'))
        .mockResolvedValueOnce(1);

      await expect(RedisPublisher.publish('document:jobs', event, 3, 5)).resolves.not.toThrow();
      expect(mockClient.publish).toHaveBeenCalledTimes(2);
    });

    it('should throw PublishFailedError when retries are exhausted', async () => {
      const event = EventFactory.create('DOCUMENT_UPLOADED', { docId: 1 }, {
        correlationId: 'c-123',
        requestId: 'r-123',
      });

      vi.mocked(mockClient.publish).mockRejectedValue(new Error('Persistent error'));

      await expect(RedisPublisher.publish('document:jobs', event, 3, 5)).rejects.toThrow(PublishFailedError);
      expect(mockClient.publish).toHaveBeenCalledTimes(3);
    });
  });
});
