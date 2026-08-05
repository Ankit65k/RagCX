import { ProcessingStatus, UploadStatus } from '@prisma/client';

/**
 * Composite Document State matching both upload status and processing status.
 */
export interface CompositeDocumentState {
  uploadStatus: UploadStatus;
  processingStatus: ProcessingStatus;
}

/**
 * Unified Workflow States for State Machine transitions.
 */
export type DocumentWorkflowState =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'REPROCESSING'
  | 'DELETED';

/**
 * Supported Lifecycle Operations/Transitions.
 */
export type LifecycleOperation =
  | 'UPLOAD_START'
  | 'UPLOAD_COMPLETE'
  | 'QUEUE'
  | 'PROCESS_START'
  | 'PROCESS_COMPLETE'
  | 'PROCESS_FAIL'
  | 'SOFT_DELETE'
  | 'PERMANENT_DELETE'
  | 'RESTORE'
  | 'REPROCESS'
  | 'ARCHIVE';
