import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { LocalStorageProvider } from '../../../infrastructure/storage/providers/local-storage.provider.js';
import { generateChecksum } from '../../../infrastructure/storage/utils/checksum.util.js';
import { validateFile } from '../../../infrastructure/storage/validators/file.validator.js';
import { FileTooLargeError, InvalidFileTypeError } from '../../../infrastructure/storage/errors/storage.errors.js';

describe('LocalStorageProvider & Storage Utilities Test Suite', () => {
  const tempStorageDir = path.resolve(process.cwd(), './src/modules/documents/__tests__/temp-uploads');
  let storageProvider: LocalStorageProvider;

  beforeAll(() => {
    if (!fs.existsSync(tempStorageDir)) {
      fs.mkdirSync(tempStorageDir, { recursive: true });
    }
    storageProvider = new LocalStorageProvider(tempStorageDir);
  });

  afterAll(() => {
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('Validation Rules', () => {
    it('should pass on valid PDF type and size', () => {
      expect(() => validateFile('application/pdf', 1024)).not.toThrow();
    });

    it('should throw InvalidFileTypeError for non-PDF mime types', () => {
      expect(() => validateFile('image/png', 1024)).toThrow(InvalidFileTypeError);
      expect(() => validateFile('text/plain', 1024)).toThrow(InvalidFileTypeError);
    });

    it('should throw FileTooLargeError for files larger than 20MB', () => {
      const excessiveSize = 20 * 1024 * 1024 + 1;
      expect(() => validateFile('application/pdf', excessiveSize)).toThrow(FileTooLargeError);
    });
  });

  describe('Checksum Computation', () => {
    it('should generate identical checksums for identical buffers', () => {
      const buffer1 = Buffer.from('hello world pdf data');
      const buffer2 = Buffer.from('hello world pdf data');
      const buffer3 = Buffer.from('different pdf data');

      const hash1 = generateChecksum(buffer1);
      const hash2 = generateChecksum(buffer2);
      const hash3 = generateChecksum(buffer3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA-256 hex output length
    });
  });

  describe('File Lifecycle Operations', () => {
    it('should support upload, exists check, reading, and deletion', async () => {
      const fileBuffer = Buffer.from('mock pdf content');
      const filename = `${Date.now()}-document.pdf`;

      // 1. Upload
      const uploadContext = await storageProvider.upload(fileBuffer, filename);
      expect(uploadContext.storedFilename).toBe(filename);
      expect(uploadContext.storedFilename).toBeDefined();
      expect(uploadContext.storagePath).toBeDefined();

      // Verify physical file was written
      const physicalPath = uploadContext.storagePath;
      expect(fs.existsSync(physicalPath)).toBe(true);

      // 2. Exists
      await expect(storageProvider.exists(physicalPath)).resolves.toBe(true);

      // 3. Read
      const readBuffer = await storageProvider.read(physicalPath);
      expect(readBuffer.toString()).toBe(fileBuffer.toString());

      // 4. Delete
      await expect(storageProvider.delete(physicalPath)).resolves.not.toThrow();
      expect(fs.existsSync(physicalPath)).toBe(false);
      await expect(storageProvider.exists(physicalPath)).resolves.toBe(false);
    });

    it('should throw when reading non-existent files', async () => {
      await expect(storageProvider.read('non-existent.pdf')).rejects.toThrow();
    });
  });
});
