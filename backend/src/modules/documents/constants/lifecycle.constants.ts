import { DocumentWorkflowState } from '../types/lifecycle.types.js';

/**
 * Centralized transition map defining which target states are valid from any current state.
 */
export const ALLOWED_TRANSITIONS: Record<DocumentWorkflowState, DocumentWorkflowState[]> = {
  UPLOADING:    ['UPLOADED'],
  UPLOADED:     ['QUEUED', 'DELETED'],
  QUEUED:       ['PROCESSING', 'FAILED', 'DELETED'],
  PROCESSING:   ['PROCESSED', 'FAILED'],
  PROCESSED:    ['DELETED', 'REPROCESSING'],
  FAILED:       ['REPROCESSING', 'DELETED'],
  REPROCESSING: ['QUEUED', 'PROCESSING'],
  DELETED:      ['UPLOADED'],
};
