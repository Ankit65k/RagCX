import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { createFileFilter } from '../validators/file.validator.js';

// ─────────────────────────────────────────────────────────────────────────────
// Why memoryStorage?
// ─────────────────────────────────────────────────────────────────────────────
//
// We use Multer's memoryStorage instead of diskStorage for two reasons:
//
// 1. Checksum computation requires the raw buffer BEFORE writing to disk.
//    With diskStorage, we'd need to read the file back from disk just to
//    hash it — a wasteful extra I/O round-trip.
//
// 2. Keeping storage decisions inside the LocalStorageProvider (atomic tmp →
//    rename) rather than inside Multer keeps the upload pipeline consistent
//    across all providers (local, S3, GCS). The provider's upload() method
//    receives the buffer directly from req.file.buffer.
//
// Trade-off: The file lives in process memory until the service writes it.
// The 25 MB ceiling mitigates memory pressure. For larger files (video, etc.)
// a streaming diskStorage approach would be more appropriate.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configured Multer instance for document uploads.
 *
 * Enforces:
 * - Memory storage (buffer available on req.file.buffer).
 * - File size ceiling (default 25 MB, configurable via DOCUMENT_LIMITS).
 * - MIME-type allow-list via fileFilter.
 * - Single-file upload only (`upload.single('file')`).
 *
 * @example
 * router.post('/upload', upload.single('file'), documentController.upload);
 */

const MAX_FILE_SIZE = process.env.UPLOAD_MAX_SIZE_BYTES
  ? parseInt(process.env.UPLOAD_MAX_SIZE_BYTES, 10)
  : 25 * 1024 * 1024; // 25 MB default

export const multerConfig = multer({
  storage: multer.memoryStorage() as StorageEngine,

  limits: {
    fileSize:  MAX_FILE_SIZE,
    files:     1,       // One file per request.
    fields:    10,      // Reasonable cap on non-file form fields.
    fieldSize: 1024,    // 1 KB cap per field value.
  },

  fileFilter: createFileFilter() as (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => void,
});

export default multerConfig;
