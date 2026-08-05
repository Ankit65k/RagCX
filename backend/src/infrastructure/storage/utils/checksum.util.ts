import crypto from 'crypto';
import { ChecksumError } from '../errors/storage.errors.js';

/**
 * Generates a SHA-256 hex-encoded checksum of the given file buffer.
 *
 * The checksum is used to:
 *  - Detect duplicate uploads (same content, different filename).
 *  - Verify file integrity after retrieval from storage.
 *  - Validate file integrity before handing to the AI Service.
 *
 * @param buffer  Raw file content as a Node.js Buffer.
 * @returns       Lowercase hex string of the SHA-256 digest (64 characters).
 *
 * @throws {ChecksumError}  If the hash computation fails for any reason.
 *
 * @example
 * const checksum = generateChecksum(fileBuffer);
 * // → "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 */
export const generateChecksum = (buffer: Buffer): string => {
  try {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (error) {
    throw new ChecksumError(
      'Failed to compute SHA-256 checksum for the uploaded file.',
      error,
    );
  }
};
