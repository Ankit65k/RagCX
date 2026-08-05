import { Document, ProcessingStatus, UploadStatus } from '@prisma/client';
import { CompositeDocumentState, DocumentWorkflowState } from '../types/lifecycle.types.js';

/**
 * Maps a Prisma Document database record to a typed CompositeDocumentState object.
 */
export function getCompositeState(doc: Document): CompositeDocumentState {
  return {
    uploadStatus:     doc.uploadStatus,
    processingStatus: doc.processingStatus,
  };
}

/**
 * Converts a composite database status to a unified workflow state.
 */
export function getWorkflowState(state: CompositeDocumentState): DocumentWorkflowState {
  if (state.uploadStatus === UploadStatus.DELETED) {
    return 'DELETED';
  }
  if (state.uploadStatus === UploadStatus.UPLOADING) {
    return 'UPLOADING';
  }

  // uploadStatus is UPLOADED
  switch (state.processingStatus) {
    case ProcessingStatus.PROCESSING:
      return 'PROCESSING';
    case ProcessingStatus.COMPLETED:
      return 'PROCESSED';
    case ProcessingStatus.FAILED:
      return 'FAILED';
    case ProcessingStatus.PENDING:
    default:
      return 'QUEUED'; // Maps PENDING to QUEUED workflow state
  }
}

/**
 * Returns a human-readable description of the document composite state.
 */
export function formatCompositeState(state: CompositeDocumentState): string {
  return `[Upload: ${state.uploadStatus}, Processing: ${state.processingStatus}]`;
}
