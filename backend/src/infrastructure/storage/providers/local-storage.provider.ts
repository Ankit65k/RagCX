import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

import type {
  IStorageProvider,
  StorageCopyOptions,
  StorageUploadOptions,
  StorageUploadResult,
} from '../interfaces/storage-provider.interface.js';
import {
  StorageError,
  UploadFailedError,
} from '../errors/storage.errors.js';
import { generateChecksum } from '../utils/checksum.util.js';
import { generateStoragePath } from '../utils/storage-path.util.js';
import logger from '../../logger/logger.js';

const pipelineAsync = promisify(pipeline);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Allow-list of safe, lowercase extensions. */
const SAFE_EXTENSIONS: ReadonlySet<string> = new Set(['pdf']);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LocalStorageProvider — stores files on the local filesystem.
 *
 * Design decisions:
 * - `memoryStorage` mode is used with Multer so that the buffer is available
 *   for checksum computation before the file touches disk.
 * - All disk writes are atomic: the buffer is written to a `.tmp` file and
 *   renamed on success, preventing a partially-written file from being visible.
 * - Directories are created recursively on first write (`fs.mkdir(..., recursive: true)`).
 * - Implements the full `IStorageProvider` contract so it can be swapped for
 *   an S3Provider without touching the Document Service.
 */
export class LocalStorageProvider implements IStorageProvider {
  constructor(private readonly _basePath: string) {}

  /** The base directory this provider writes to. */
  get basePath(): string { return this._basePath; }

  // ─── upload ──────────────────────────────────────────────────────────────

  async upload(
    file: Buffer | Readable,
    filename: string,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    const storagePath = this.generatePath(options.subPath);
    const fullPath    = path.join(storagePath, filename);
    const tmpPath     = `${fullPath}.tmp`;

    logger.info({ storagePath, filename }, 'Upload started');

    try {
      // Ensure the target directory exists.
      await fs.mkdir(storagePath, { recursive: true });

      // Check for existing file unless overwrite is allowed.
      if (!options.overwrite) {
        const alreadyExists = await this.exists(fullPath);
        if (alreadyExists) {
          throw new StorageError(
            `File already exists at "${fullPath}". Set overwrite=true to replace it.`,
            'FILE_EXISTS',
          );
        }
      }

      // Coerce the input into a Buffer for atomic write + checksum.
      const buffer = Buffer.isBuffer(file)
        ? file
        : await this.streamToBuffer(file);

      // Write to a temp file first for atomicity.
      await fs.writeFile(tmpPath, buffer);

      // Atomic rename — file becomes visible only after a full write.
      await fs.rename(tmpPath, fullPath);

      const checksum = generateChecksum(buffer);

      logger.info({ storagePath, filename, fileSize: buffer.length }, 'Upload completed');

      return { storagePath: fullPath, storedFilename: filename, checksum };
    } catch (error) {
      // Clean up the temporary file if present.
      await fs.unlink(tmpPath).catch(() => undefined);

      logger.error({ err: error, filename }, 'Upload failed');

      if (error instanceof StorageError) throw error;

      throw new UploadFailedError(
        `Failed to write file "${filename}" to local storage.`,
        error,
      );
    }
  }

  // ─── delete ──────────────────────────────────────────────────────────────

  async delete(storagePath: string): Promise<void> {
    logger.info({ storagePath }, 'Delete started');

    try {
      await fs.unlink(storagePath);
      logger.info({ storagePath }, 'Delete completed');
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      // Idempotent: a missing file is not an error.
      if (nodeError.code === 'ENOENT') {
        logger.warn({ storagePath }, 'Delete skipped — file not found');
        return;
      }

      logger.error({ err: error, storagePath }, 'Delete failed');
      throw new StorageError(
        `Failed to delete file at "${storagePath}".`,
        'DELETE_FAILED',
      );
    }
  }

  // ─── exists ──────────────────────────────────────────────────────────────

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  // ─── read ────────────────────────────────────────────────────────────────

  async read(storagePath: string): Promise<Buffer> {
    logger.info({ storagePath }, 'Read started');

    try {
      const buffer = await fs.readFile(storagePath);
      logger.info({ storagePath, fileSize: buffer.length }, 'Read completed');
      return buffer;
    } catch (error) {
      logger.error({ err: error, storagePath }, 'Read failed');
      throw new StorageError(
        `Failed to read file at "${storagePath}".`,
        'READ_FAILED',
      );
    }
  }

  // ─── move ────────────────────────────────────────────────────────────────

  async move(
    sourcePath: string,
    destinationPath: string,
    options: StorageCopyOptions = {},
  ): Promise<void> {
    if (!options.overwrite) {
      const exists = await this.exists(destinationPath);
      if (exists) {
        throw new StorageError(
          `Cannot move to "${destinationPath}" — file already exists.`,
          'FILE_EXISTS',
        );
      }
    }

    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.rename(sourcePath, destinationPath);
    } catch {
      // rename() fails across filesystem boundaries — fall back to copy + delete.
      await this.copy(sourcePath, destinationPath, options);
      await fs.unlink(sourcePath);
    }
  }

  // ─── copy ────────────────────────────────────────────────────────────────

  async copy(
    sourcePath: string,
    destinationPath: string,
    options: StorageCopyOptions = {},
  ): Promise<void> {
    if (!options.overwrite) {
      const exists = await this.exists(destinationPath);
      if (exists) {
        throw new StorageError(
          `Cannot copy to "${destinationPath}" — file already exists.`,
          'FILE_EXISTS',
        );
      }
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });

    await pipelineAsync(
      createReadStream(sourcePath),
      createWriteStream(destinationPath),
    );
  }

  // ─── generatePath ────────────────────────────────────────────────────────

  generatePath(subPath?: string): string {
    return generateStoragePath(subPath);
  }

  // ─── generateFilename ────────────────────────────────────────────────────

  generateFilename(extension: string): string {
    const ext = extension.toLowerCase().replace(/^\./, '');

    if (!SAFE_EXTENSIONS.has(ext)) {
      throw new StorageError(
        `Extension "${ext}" is not allowed.`,
        'INVALID_EXTENSION',
      );
    }

    return `${uuidv4()}-${Date.now()}.${ext}`;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private streamToBuffer(readable: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      readable.on('data', (chunk: Buffer) => chunks.push(chunk));
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', reject);
    });
  }
}
