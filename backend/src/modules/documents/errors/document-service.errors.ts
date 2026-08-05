/**
 * Service-layer error hierarchy for the Document module.
 *
 * These errors sit above the repository errors. The service translates
 * low-level repository / storage errors into domain-meaningful types
 * before they surface to controllers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export class DocumentServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'DOCUMENT_SERVICE_ERROR') {
    super(message);
    this.name = 'DocumentServiceError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a document lookup by ID returns nothing.
 * Maps to HTTP 404.
 */
export class DocumentNotFoundError extends DocumentServiceError {
  public readonly documentId: string;

  constructor(identifier: string) {
    super(`Document "${identifier}" was not found.`, 'DOCUMENT_NOT_FOUND');
    this.name = 'DocumentNotFoundError';
    this.documentId = identifier;
  }
}

/**
 * Thrown when an upload with the same SHA-256 checksum already exists
 * for the same user. Maps to HTTP 409.
 */
export class DuplicateDocumentError extends DocumentServiceError {
  public readonly checksum: string;
  public readonly existingDocumentId: string;

  constructor(checksum: string, existingDocumentId: string) {
    super(
      `A document with this content already exists (id: ${existingDocumentId}).`,
      'DUPLICATE_DOCUMENT',
    );
    this.name = 'DuplicateDocumentError';
    this.checksum = checksum;
    this.existingDocumentId = existingDocumentId;
  }
}

/**
 * Thrown when an operation is attempted on a document that is in an
 * incompatible lifecycle state (e.g. reprocessing a deleted document).
 * Maps to HTTP 422.
 */
export class InvalidDocumentStateError extends DocumentServiceError {
  public readonly documentId: string;
  public readonly currentState: string;
  public readonly expectedState?: string;

  constructor(documentId: string, currentState: string, expectedState?: string) {
    super(
      expectedState
        ? `Document "${documentId}" is in state "${currentState}" but must be in "${expectedState}" for this operation.`
        : `Document "${documentId}" is in an invalid state "${currentState}" for this operation.`,
      'INVALID_DOCUMENT_STATE',
    );
    this.name = 'InvalidDocumentStateError';
    this.documentId = documentId;
    this.currentState = currentState;
    this.expectedState = expectedState;
  }
}

/**
 * Thrown when a storage operation (upload / delete) fails irrecoverably.
 * Maps to HTTP 500.
 */
export class StorageFailureError extends DocumentServiceError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'STORAGE_FAILURE');
    this.name = 'StorageFailureError';
    this.cause = cause;
  }
}

/**
 * Thrown when a Redis publish call fails.
 * Maps to HTTP 500 — but the database operation may have already succeeded,
 * so callers must treat this as a partial-failure scenario.
 */
export class RedisPublishError extends DocumentServiceError {
  public readonly eventType: string;
  public readonly cause: unknown;

  constructor(eventType: string, cause?: unknown) {
    super(
      `Failed to publish Redis event "${eventType}". The database record may still have been persisted.`,
      'REDIS_PUBLISH_FAILED',
    );
    this.name = 'RedisPublishError';
    this.eventType = eventType;
    this.cause = cause;
  }
}

/**
 * Thrown when the caller does not own the requested document.
 * Maps to HTTP 403.
 */
export class DocumentOwnershipError extends DocumentServiceError {
  public readonly documentId: string;
  public readonly requestedBy: string;

  constructor(documentId: string, requestedBy: string) {
    super(
      `User "${requestedBy}" does not own document "${documentId}".`,
      'DOCUMENT_OWNERSHIP_DENIED',
    );
    this.name = 'DocumentOwnershipError';
    this.documentId = documentId;
    this.requestedBy = requestedBy;
  }
}
