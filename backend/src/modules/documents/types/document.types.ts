import { DocumentProcessingStatus, DocumentRedisEvent } from '../constants/document.constants.js';

/**
 * Structural metadata representation for documents.
 */
export interface DocumentMetadata {
  documentId: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  extension: string;
  fileSize: number;
  pageCount: number;
  checksum: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt: Date;
  status: DocumentProcessingStatus;
}

/**
 * Payload definitions for Redis pub/sub orchestration
 */
export interface DocumentUploadedPayload {
  documentId: string;
  storagePath: string;
  uploadedBy: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export interface DocumentProcessingStartedPayload {
  documentId: string;
  startedAt: Date;
}

export interface DocumentProcessingCompletedPayload {
  documentId: string;
  pageCount: number;
  completedAt: Date;
}

export interface DocumentProcessingFailedPayload {
  documentId: string;
  reason: string;
  failedAt: Date;
}

export interface DocumentReprocessRequestedPayload {
  documentId: string;
  storagePath: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface DocumentDeletedPayload {
  documentId: string;
  storagePath: string;
  deletedBy: string;
  deletedAt: Date;
}

/**
 * Mapping mapping RedisEvent types to their respective payload types
 */
export type DocumentEventPayloadMap = {
  [DocumentRedisEvent.DOCUMENT_UPLOADED]: DocumentUploadedPayload;
  [DocumentRedisEvent.DOCUMENT_PROCESSING_STARTED]: DocumentProcessingStartedPayload;
  [DocumentRedisEvent.DOCUMENT_PROCESSING_COMPLETED]: DocumentProcessingCompletedPayload;
  [DocumentRedisEvent.DOCUMENT_PROCESSING_FAILED]: DocumentProcessingFailedPayload;
  [DocumentRedisEvent.DOCUMENT_REPROCESS_REQUESTED]: DocumentReprocessRequestedPayload;
  [DocumentRedisEvent.DOCUMENT_DELETED]: DocumentDeletedPayload;
};

/**
 * Envelope for a Redis Event message
 */
export interface DocumentEventEnvelope<T extends DocumentRedisEvent> {
  event: T;
  payload: DocumentEventPayloadMap[T];
  correlationId: string;
  timestamp: Date;
}
