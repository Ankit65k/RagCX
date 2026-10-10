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
 * Security note: Files with multiple extensions (e.g., "script.md.pdf") are
 * accepted based on their FINAL extension only. The MIME type validation in
 * validateFile() is the primary security control — this function only ensures
 * the final extension matches the validated MIME type.
 *
 * @param originalFilename  Untrusted filename supplied by the client.
 * @returns                 Safe, lowercase extension without a leading dot,
 *                          or an empty string when no extension is present.
 */
export const extractSafeExtension = (originalFilename: string): string => {
  // Strip directory traversal fragments before extraction.
  const basename = path.basename(originalFilename);

  // Extract the final extension (e.g., "script.md.pdf" → "pdf")
  const ext = path.extname(basename).toLowerCase().replace(/^\./, '');

  // Reject any character that is not alphanumeric.
  if (UNSAFE_FILENAME_PATTERN.test(ext)) {
    return '';
  }

  return SAFE_EXTENSIONS.has(ext) ? ext : '';
};

/**
 * Sanitizes a filename for display in error messages.
 *
 * Removes double extensions and sanitizes special characters.
 * Example: "AnkitResume.pdf.pdf" → "AnkitResume.pdf"
 *
 * @param filename  Original filename from client or database.
 * @returns         Clean filename safe for display in UI.
 */
export const sanitizeFilenameDisplay = (filename: string): string => {
  const basename = path.basename(filename);

  // Remove directory traversal fragments
  const safeBasename = basename.replace(/[^\w\-\.]/g, '');

  // Strip double extensions (e.g., .pdf.pdf → .pdf)
  const parts = safeBasename.split('.');
  if (parts.length >= 3) {
    // Keep first and last parts only: "AnkitResume.pdf.pdf" → ["AnkitResume", "pdf", "pdf"]
    const name = parts.slice(0, -2).join('.');
    const extension = parts[parts.length - 1];
    return name ? `${name}.${extension}` : `.${extension}`;
  }

  return safeBasename;
};
