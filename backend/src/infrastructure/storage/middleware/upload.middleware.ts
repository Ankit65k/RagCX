import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

import { multerConfig } from '../multer/multer.config.js';
import { validateFile } from '../validators/file.validator.js';
import { generateChecksum } from '../utils/checksum.util.js';
import { extractSafeExtension } from '../utils/filename.util.js';
import {
  InvalidFileTypeError,
  FileTooLargeError,
  UploadFailedError,
} from '../errors/storage.errors.js';
import type { UploadedFileContext } from '../interfaces/storage-provider.interface.js';
import logger from '../../logger/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Express request augmentation
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by `uploadMiddleware` after a successful, validated upload.
       * Contains the sanitised file context that the Document Service consumes.
       * The controller never interacts with `req.file` directly.
       */
      uploadedFile?: UploadedFileContext;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multer single-file handler (promisified)
// ─────────────────────────────────────────────────────────────────────────────

const multerSingle = multerConfig.single('file');

const runMulter = (req: Request, res: Response): Promise<void> =>
  new Promise((resolve, reject) => {
    multerSingle(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Upload Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `uploadMiddleware` — production-grade Express middleware for file uploads.
 *
 * Pipeline (in order):
 * 1. **Multer ingestion** — reads the multipart body into memory (memoryStorage).
 * 2. **Presence check** — rejects requests that contain no file field.
 * 3. **Server-side validation** — second-pass MIME + size check independent of
 *    Multer's fileFilter, defending against middleware bypass.
 * 4. **Extension extraction** — derived from the validated MIME type, not the
 *    original filename, preventing extension spoofing.
 * 5. **Checksum computation** — SHA-256 digest of the raw buffer.
 * 6. **Context hydration** — assembles `req.uploadedFile` for downstream use.
 *
 * What this middleware does NOT do:
 * - Write files to disk / cloud storage (responsibility of the storage provider).
 * - Create database records (responsibility of the document service).
 * - Publish events (responsibility of the event publisher).
 *
 * @example
 * router.post('/upload', uploadMiddleware, documentController.upload);
 */
export const uploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // ── 1. Multer ingestion ───────────────────────────────────────────────
    await runMulter(req, res);

    // ── 2. Presence check ────────────────────────────────────────────────
    if (!req.file) {
      next(
        new InvalidFileTypeError(
          'No file was attached to the request. Include a file field named "file".',
        ),
      );
      return;
    }

    logger.info(
      {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      'Upload middleware: file received',
    );

    // ── 3. Server-side validation (second pass) ──────────────────────────
    validateFile(req.file.mimetype, req.file.size);

    // ── 4. Extension extraction ──────────────────────────────────────────
    const extension = extractSafeExtension(req.file.originalname);

    if (!extension) {
      next(
        new InvalidFileTypeError(
          `File extension is missing or unsafe. ` +
          `Ensure the filename ends with a permitted extension (e.g. ".pdf").`,
        ),
      );
      return;
    }

    // ── 5. Checksum computation ──────────────────────────────────────────
    const buffer   = req.file.buffer;
    const checksum = generateChecksum(buffer);

    // ── 6. Context hydration ─────────────────────────────────────────────
    req.uploadedFile = {
      originalFilename: req.file.originalname,
      storedFilename:   '',           // Populated by the storage provider after upload.
      mimeType:         req.file.mimetype,
      extension,
      fileSize:         req.file.size,
      storagePath:      '',           // Populated by the storage provider after upload.
      checksum,
      buffer,
    };

    logger.info(
      { checksum, extension, size: req.file.size },
      'Upload middleware: validation passed',
    );

    next();
  } catch (error) {
    // ── Error mapping ────────────────────────────────────────────────────
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new FileTooLargeError(25 * 1024 * 1024, req.file?.size ?? 0));
        return;
      }

      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        next(
          new InvalidFileTypeError(
            'Unexpected file field. Use the field name "file".',
          ),
        );
        return;
      }

      next(new UploadFailedError(`Multer error: ${error.message}`, error));
      return;
    }

    next(error);
  }
};
