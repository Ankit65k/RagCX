/**
 * Typed error hierarchy for the Document Repository layer.
 *
 * Each class carries a stable `code` for error-handler mapping
 * and structured-log tagging without string-matching on messages.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export class RepositoryError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'REPOSITORY_ERROR') {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a query for a specific document returns no result.
 */
export class DocumentNotFoundError extends RepositoryError {
  public readonly documentId: string;

  constructor(identifier: string) {
    super(`Document not found: "${identifier}".`, 'DOCUMENT_NOT_FOUND');
    this.name = 'DocumentNotFoundError';
    this.documentId = identifier;
  }
}

/**
 * Thrown when an insert or duplicate-check finds an identical checksum
 * already stored for the requesting user.
 */
export class DuplicateDocumentError extends RepositoryError {
  public readonly checksum: string;
  public readonly existingDocumentId: string;

  constructor(checksum: string, existingDocumentId: string) {
    super(
      `A document with checksum "${checksum}" already exists (id: ${existingDocumentId}).`,
      'DUPLICATE_DOCUMENT',
    );
    this.name = 'DuplicateDocumentError';
    this.checksum = checksum;
    this.existingDocumentId = existingDocumentId;
  }
}

/**
 * Wraps an unexpected database-level error (e.g. connection loss, constraint
 * violation) so that upper layers never catch raw Prisma errors.
 */
export class DatabaseError extends RepositoryError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}
