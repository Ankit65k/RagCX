import { Readable } from 'stream';

// ─────────────────────────────────────────────────────────────────────────────
// Supporting value types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Providers that the StorageFactory can instantiate.
 * Extend this union when new backends are added (S3, GCS, Azure, MinIO…).
 */
export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'minio';

/**
 * All context needed by the storage layer to place an uploaded file.
 * Populated by the upload middleware before a service ever sees the request.
 */
export interface UploadedFileContext {
  /** Sanitised, UUID-based filename stored on disk. Never the original name. */
  storedFilename: string;

  /** Original client-supplied filename (for display / metadata only). */
  originalFilename: string;

  /** Validated MIME type (e.g. "application/pdf"). */
  mimeType: string;

  /** Safe, lowercase extension without the leading dot. */
  extension: string;

  /** File size in bytes. */
  fileSize: number;

  /** Absolute path on storage where the file was written. */
  storagePath: string;

  /** SHA-256 hex digest of the raw file buffer. */
  checksum: string;

  /** In-memory buffer — present when using Multer memoryStorage(). */
  buffer?: Buffer;
}

/**
 * Result returned by IStorageService.upload().
 */
export interface StorageUploadResult {
  /** Absolute or provider-relative path where the file now resides. */
  storagePath: string;

  /** Stored filename (UUID-based). */
  storedFilename: string;

  /** SHA-256 checksum of the file that was persisted. */
  checksum: string;
}

/**
 * Options accepted by IStorageService.upload().
 */
export interface StorageUploadOptions {
  /** Desired subdirectory within the base storage root. Defaults to date-based path. */
  subPath?: string;

  /** Overwrite an existing file at the same path. Defaults to false. */
  overwrite?: boolean;
}

/**
 * Options accepted by IStorageService.copy() and IStorageService.move().
 */
export interface StorageCopyOptions {
  overwrite?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core storage contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider-agnostic storage contract.
 *
 * Implementations (LocalStorageProvider, S3StorageProvider…) fulfil this
 * interface so that the Document Service never depends on a concrete backend.
 */
export interface IStorageProvider {
  /**
   * Persists a file buffer or stream to storage.
   *
   * @param file        Raw file content.
   * @param filename    Target filename (generated, not user-supplied).
   * @param options     Optional overrides.
   * @returns           Metadata about the persisted file.
   */
  upload(
    file: Buffer | Readable,
    filename: string,
    options?: StorageUploadOptions,
  ): Promise<StorageUploadResult>;

  /**
   * Permanently removes a file from storage.
   *
   * @param storagePath Full path returned by upload().
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Returns true if a file exists at the given path, false otherwise.
   *
   * @param storagePath Full path to check.
   */
  exists(storagePath: string): Promise<boolean>;

  /**
   * Reads a file from storage and returns it as a Buffer.
   *
   * @param storagePath Full path returned by upload().
   */
  read(storagePath: string): Promise<Buffer>;

  /**
   * Moves a file from one storage location to another (atomic where possible).
   *
   * @param sourcePath      Current location.
   * @param destinationPath Target location.
   * @param options         Optional overrides.
   */
  move(
    sourcePath: string,
    destinationPath: string,
    options?: StorageCopyOptions,
  ): Promise<void>;

  /**
   * Copies a file within storage, leaving the source intact.
   *
   * @param sourcePath      File to copy.
   * @param destinationPath Where to place the copy.
   * @param options         Optional overrides.
   */
  copy(
    sourcePath: string,
    destinationPath: string,
    options?: StorageCopyOptions,
  ): Promise<void>;

  /**
   * Generates a structured, date-partitioned storage path.
   * Example: /uploads/documents/2024/01/15/
   *
   * @param subPath  Optional additional path segment after the base.
   */
  generatePath(subPath?: string): string;

  /**
   * Generates a collision-resistant filename from a UUID and timestamp.
   *
   * @param extension  File extension without the leading dot (e.g. "pdf").
   */
  generateFilename(extension: string): string;
}
