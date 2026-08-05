import { BusEvent } from '../../event-bus/interfaces/event-bus.interface.js';

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConsumerEventType =
  | 'DOCUMENT_PROCESSING_STARTED'
  | 'DOCUMENT_PROCESSING_COMPLETED'
  | 'DOCUMENT_PROCESSING_FAILED';

// ─────────────────────────────────────────────────────────────────────────────
// Payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentProcessingStartedPayload {
  documentId: string;
  startedAt: string;
}

export interface DocumentProcessingCompletedPayload {
  documentId: string;
  processingStatus: 'COMPLETED';
  pageCount: number;
  chunkCount: number;
  embeddingCount: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

export interface DocumentProcessingFailedPayload {
  documentId: string;
  processingStatus: 'FAILED';
  reason: string;
  failedAt: string;
  retryCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registry of handler callbacks mapped by event type.
 */
export interface IEventHandler<T = unknown> {
  handle(event: BusEvent<T>): Promise<void>;
}

/**
 * Dead Letter Queue abstraction to support future resiliency.
 */
export interface IDeadLetterQueue {
  /**
   * Routes a failed message to the DLQ channel.
   */
  sendToDLQ<T>(event: BusEvent<T>, reason: string): Promise<void>;
}

/**
 * Handles mapping of events to their specific handlers.
 */
export interface IEventDispatcher {
  register(eventType: string, handler: IEventHandler): void;
  dispatch(event: BusEvent): Promise<void>;
}
