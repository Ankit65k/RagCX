import { Readable } from 'stream';

/**
 * Interface representing physical file storage engine operations (Local, AWS S3, etc.).
 */
export interface IStorageService {
  /**
   * Uploads a file stream or buffer to the designated storage path.
   */
  uploadFile(file: Buffer | Readable, storagePath: string): Promise<void>;

  /**
   * Removes a file from physical storage.
   */
  deleteFile(storagePath: string): Promise<void>;

  /**
   * Retrieves a file as a readable buffer.
   */
  getFile(storagePath: string): Promise<Buffer>;

  /**
   * Generates a unique, structured path on storage to prevent file collisions.
   */
  generateStoragePath(filename: string, userId: string): string;

  /**
   * Validates file size and file type constraints before storage.
   */
  validateFile(filename: string, mimeType: string, fileSize: number): void;
}
export default IStorageService;
