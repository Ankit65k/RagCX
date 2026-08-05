/**
 * Storage Infrastructure — Public API
 *
 * All external modules (Document Service, Document Controller) should import
 * exclusively from this barrel. Direct imports from sub-modules are internal
 * implementation details and subject to change without notice.
 */

// Errors
export {
  StorageError,
  InvalidFileTypeError,
  FileTooLargeError,
  UploadFailedError,
  ChecksumError,
} from './errors/storage.errors.js';

// Interfaces & Types
export type {
  IStorageProvider,
  StorageProvider,
  UploadedFileContext,
  StorageUploadResult,
  StorageUploadOptions,
  StorageCopyOptions,
} from './interfaces/storage-provider.interface.js';

// Provider implementations
export { LocalStorageProvider } from './providers/local-storage.provider.js';

// Factory + singleton
export { StorageFactory, storageProvider } from './storage.factory.js';

// Multer configuration
export { multerConfig } from './multer/multer.config.js';

// Express middleware
export { uploadMiddleware } from './middleware/upload.middleware.js';

// Utilities
export { generateChecksum } from './utils/checksum.util.js';
export { generateFilename, extractSafeExtension } from './utils/filename.util.js';
export { generateStoragePath } from './utils/storage-path.util.js';

// Validators
export { validateFile, createFileFilter } from './validators/file.validator.js';
