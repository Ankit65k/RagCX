/**
 * Typed error hierarchy for the file storage infrastructure.
 *
 * Each error class carries a stable `code` string so that API error handlers
 * and monitoring tools can identify failure categories without relying on
 * brittle message-string matching.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base Storage Error
// ─────────────────────────────────────────────────────────────────────────────

import { BaseException } from '../../../common/exceptions/base.exception.js';

export class StorageError extends BaseException {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'STORAGE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Errors  (HTTP 400 / 415)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when the MIME type or file extension is not in the allow-list.
 */
export class InvalidFileTypeError extends StorageError {
  constructor(message: string) {
    super(message, 'INVALID_FILE_TYPE', 400);
    this.name = 'InvalidFileTypeError';
  }
}

/**
 * Thrown when the uploaded file exceeds the configured size ceiling.
 */
export class FileTooLargeError extends StorageError {
  public readonly limitBytes: number;
  public readonly actualBytes: number;

  constructor(limitBytes: number, actualBytes: number) {
    super(
      `File size ${actualBytes} bytes exceeds the maximum allowed size of ${limitBytes} bytes.`,
      'FILE_TOO_LARGE',
      400,
    );
    this.name = 'FileTooLargeError';
    this.limitBytes = limitBytes;
    this.actualBytes = actualBytes;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// I/O Errors  (HTTP 500)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when the file cannot be written to the storage backend.
 */
export class UploadFailedError extends StorageError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'UPLOAD_FAILED');
    this.name = 'UploadFailedError';
    this.cause = cause;
  }
}

/**
 * Thrown when computing a SHA-256 checksum fails.
 */
export class ChecksumError extends StorageError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'CHECKSUM_ERROR');
    this.name = 'ChecksumError';
    this.cause = cause;
  }
}
