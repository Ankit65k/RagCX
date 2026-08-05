/**
 * Document Processing Lifecycle Statuses
 */
export enum DocumentProcessingStatus {
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
  REPROCESSING = 'REPROCESSING',
}

/**
 * Event channels/names used to orchestrate async workflows on Redis.
 */
export enum DocumentRedisEvent {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_PROCESSING_STARTED = 'DOCUMENT_PROCESSING_STARTED',
  DOCUMENT_PROCESSING_COMPLETED = 'DOCUMENT_PROCESSING_COMPLETED',
  DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_REPROCESS_REQUESTED = 'DOCUMENT_REPROCESS_REQUESTED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
}

/**
 * Document upload file rules and size boundaries.
 */
export const DOCUMENT_LIMITS = Object.freeze({
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20 MB limits
  ALLOWED_EXTENSIONS: ['.pdf'] as const,
  ALLOWED_MIME_TYPES: ['application/pdf'] as const,
});
