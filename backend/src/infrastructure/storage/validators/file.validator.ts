import { DOCUMENT_LIMITS } from '../../../modules/documents/constants/document.constants.js';
import {
  InvalidFileTypeError,
  FileTooLargeError,
} from '../errors/storage.errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// Rejection constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Explicit MIME type deny-list.
 *
 * While the primary control is an allow-list (`DOCUMENT_LIMITS.ALLOWED_MIME_TYPES`),
 * this deny-list provides defence-in-depth for file types that are particularly
 * dangerous: executables, images (often used to sneak EXIF payloads), video,
 * compressed archives (zip-bomb protection), and scripts.
 */
const REJECTED_MIME_PREFIXES: readonly string[] = [
  'application/x-msdownload',     // .exe
  'application/x-executable',     // Linux ELF binaries
  'application/x-sh',             // Shell scripts
  'application/x-bat',            // Windows batch files
  'application/x-msdos-program',  // .com, .pif
  'application/java-archive',     // .jar
  'application/zip',              // .zip
  'application/x-rar',            // .rar
  'application/x-7z-compressed',  // .7z
  'application/gzip',             // .gz
  'application/x-tar',            // .tar
  'video/',                        // all video
  'audio/',                        // all audio
  'image/',                        // all images (bypass via steganography)
  'text/html',                     // HTML injection
  'text/javascript',               // script injection
  'application/javascript',        // script injection
];

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a file against the project's upload security policy.
 *
 * Checks (in order):
 * 1. File size does not exceed the configured ceiling.
 * 2. MIME type is in the explicit allow-list.
 * 3. MIME type is not on the explicit reject-list.
 *
 * This function is intentionally pure and has no side-effects.
 * Call it inside the Multer `fileFilter` callback and in the
 * upload middleware for a second-pass server-side validation.
 *
 * @param mimeType   MIME type claimed by the client (e.g. "application/pdf").
 * @param fileSize   File size in bytes.
 *
 * @throws {FileTooLargeError}     When fileSize > MAX_FILE_SIZE_BYTES.
 * @throws {InvalidFileTypeError}  When mimeType is rejected.
 */
export const validateFile = (mimeType: string, fileSize: number): void => {
  // ── 1. Size check ────────────────────────────────────────────────────────
  if (fileSize > DOCUMENT_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(DOCUMENT_LIMITS.MAX_FILE_SIZE_BYTES, fileSize);
  }

  // ── 2. Allow-list check ──────────────────────────────────────────────────
  const normalised = mimeType.trim().toLowerCase();
  const isAllowed  = (DOCUMENT_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(normalised);

  if (!isAllowed) {
    throw new InvalidFileTypeError(
      `MIME type "${mimeType}" is not permitted. ` +
      `Allowed types: [${DOCUMENT_LIMITS.ALLOWED_MIME_TYPES.join(', ')}].`,
    );
  }

  // ── 3. Deny-list check (defence in depth) ────────────────────────────────
  const isDenied = REJECTED_MIME_PREFIXES.some((prefix) =>
    normalised.startsWith(prefix),
  );

  if (isDenied) {
    throw new InvalidFileTypeError(
      `MIME type "${mimeType}" is explicitly rejected for security reasons.`,
    );
  }
};

/**
 * Multer-compatible `fileFilter` callback factory.
 *
 * Returns a function with the exact signature Multer expects, applying the
 * same allow-list validation internally.
 *
 * @example
 * multer({ fileFilter: createFileFilter() })
 */
export const createFileFilter = (): ((
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => void) => {
  return (_req, file, cb) => {
    try {
      const normalised = file.mimetype.trim().toLowerCase();
      const isAllowed  = (DOCUMENT_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(normalised);
      const isDenied   = REJECTED_MIME_PREFIXES.some((prefix) => normalised.startsWith(prefix));

      if (!isAllowed || isDenied) {
        cb(
          new InvalidFileTypeError(
            `MIME type "${file.mimetype}" is not permitted. Only PDF files are accepted.`,
          ),
          false,
        );
        return;
      }

      cb(null, true);
    } catch (error) {
      cb(error instanceof Error ? error : new Error(String(error)), false);
    }
  };
};
