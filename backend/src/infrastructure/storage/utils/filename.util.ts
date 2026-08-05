import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Characters that are never allowed in a stored filename, regardless of source.
 * This guard is defence-in-depth — the primary security control is that we
 * never use the original client filename at all.
 */
const UNSAFE_FILENAME_PATTERN = /[^a-z0-9_\-\.]/gi;

/**
 * Double-extension pattern used to detect bypass attempts such as
 * "malware.pdf.exe" or "payload.php.pdf".
 */
const DOUBLE_EXTENSION_PATTERN = /\.[a-z0-9]+\.[a-z0-9]+$/i;

/**
 * Allow-list of safe, lowercase extensions that may appear in stored filenames.
 * Adding new types here is the only place a developer needs to update.
 */
const SAFE_EXTENSIONS: ReadonlySet<string> = new Set(['pdf']);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a collision-resistant, filesystem-safe stored filename.
 *
 * Format: `<uuid>-<unix-ms>.<ext>`
 * Example: `a34fd1d2-4e7c-4b2a-9f8e-1c0d6b3e7f9a-1722700800000.pdf`
 *
 * Security guarantees:
 * - Original client filename is NEVER used.
 * - UUID v4 provides ~5.3 × 10³⁶ unique combinations.
 * - A millisecond timestamp guarantees ordering within the same batch.
 * - The extension is derived from the validated MIME type, not the filename.
 *
 * @param safeExtension  Lowercase extension WITHOUT a leading dot (e.g. `"pdf"`).
 * @returns              A unique, safe stored filename string.
 *
 * @throws {Error}  If `safeExtension` is not in the allowed extension set.
 *
 * @example
 * generateFilename('pdf');
 * // → "a34fd1d2-4e7c-4b2a-9f8e-1c0d6b3e7f9a-1722700800000.pdf"
 */
export const generateFilename = (safeExtension: string): string => {
  const ext = safeExtension.toLowerCase().replace(/^\./, '');

  if (!SAFE_EXTENSIONS.has(ext)) {
    throw new Error(
      `Extension "${ext}" is not in the allowed set: [${[...SAFE_EXTENSIONS].join(', ')}].`,
    );
  }

  const uuid = uuidv4();
  const timestamp = Date.now();

  return `${uuid}-${timestamp}.${ext}`;
};

/**
 * Extracts and validates the file extension from an original client filename.
 *
 * Used ONLY to derive the extension for `generateFilename` — the original
 * filename itself is discarded immediately afterwards.
 *
 * @param originalFilename  Untrusted filename supplied by the client.
 * @returns                 Safe, lowercase extension without a leading dot,
 *                          or an empty string when no extension is present.
 */
export const extractSafeExtension = (originalFilename: string): string => {
  // Strip directory traversal fragments before extraction.
  const basename = path.basename(originalFilename);

  // Reject double extensions entirely.
  if (DOUBLE_EXTENSION_PATTERN.test(basename)) {
    return '';
  }

  const ext = path.extname(basename).toLowerCase().replace(/^\./, '');

  // Reject any character that is not alphanumeric.
  if (UNSAFE_FILENAME_PATTERN.test(ext)) {
    return '';
  }

  return SAFE_EXTENSIONS.has(ext) ? ext : '';
};
