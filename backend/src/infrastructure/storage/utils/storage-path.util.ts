import path from 'path';
import { storageConfig } from '../../../config/storage.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Path segment character filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Characters allowed in a computed storage sub-path segment.
 * Anything outside this set is stripped before path construction.
 */
const SAFE_SEGMENT_PATTERN = /[^a-z0-9\-_]/gi;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a date-partitioned, traversal-safe storage path for documents.
 *
 * Directory structure:
 * ```
 * <base>/documents/YYYY/MM/DD[/<subPath>]/
 * ```
 * Example:
 * ```
 * ./uploads/documents/2024/01/15/
 * ./uploads/documents/2024/01/15/thumbnails/
 * ```
 *
 * Security guarantees:
 * - The `subPath` is sanitised before inclusion.
 * - `path.normalize` collapses any remaining `..` sequences.
 * - The result is always relative to `storageConfig.localPath`.
 *
 * @param subPath  Optional additional path segment appended after the date.
 *                 Must contain only alphanumeric, dash, and underscore characters.
 * @returns        Normalised absolute (or config-relative) storage path string.
 */
export const generateStoragePath = (subPath?: string): string => {
  const now = new Date();

  const year  = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(now.getUTCDate()).padStart(2, '0');

  const segments: string[] = [
    storageConfig.localPath,
    'documents',
    year,
    month,
    day,
  ];

  if (subPath) {
    const sanitised = subPath.replace(SAFE_SEGMENT_PATTERN, '').slice(0, 64);
    if (sanitised.length > 0) {
      segments.push(sanitised);
    }
  }

  // path.normalize eliminates any residual .. fragments.
  return path.normalize(path.join(...segments));
};
