import { IStateTransitionValidator } from '../interfaces/lifecycle.interface.js';
import { CompositeDocumentState, DocumentWorkflowState } from '../types/lifecycle.types.js';
import { ALLOWED_TRANSITIONS } from '../constants/lifecycle.constants.js';
import { InvalidDocumentStateError } from '../errors/document-service.errors.js';
import { getWorkflowState } from '../utils/lifecycle.helpers.js';
import {
  DocumentAlreadyDeletedError,
  DocumentAlreadyProcessingError,
  DocumentRestoreError,
  ReprocessNotAllowedError,
} from '../errors/lifecycle.errors.js';

/**
 * `StateTransitionValidator` — Centralized State Machine validator.
 */
export class StateTransitionValidator implements IStateTransitionValidator {
  /**
   * Asserts if the transition is allowed. If not, maps to specific lifecycle errors.
   *
   * @throws {DocumentServiceError}
   */
  validateTransition(
    currentState: CompositeDocumentState,
    targetState: DocumentWorkflowState,
    documentId: string,
  ): void {
    const currentWorkflowState = getWorkflowState(currentState);
    const allowed = ALLOWED_TRANSITIONS[currentWorkflowState];

    if (!allowed.includes(targetState)) {
      // 1. Map to custom exception types based on scenario for precise HTTP responses
      if (targetState === 'DELETED') {
        if (currentWorkflowState === 'DELETED') {
          throw new DocumentAlreadyDeletedError(documentId);
        }
        if (currentWorkflowState === 'PROCESSING') {
          throw new DocumentAlreadyProcessingError(documentId);
        }
      }

      if (targetState === 'UPLOADED' && currentWorkflowState !== 'DELETED') {
        throw new DocumentRestoreError(
          documentId,
          `Cannot restore document that is not currently soft deleted (current state: ${currentWorkflowState}).`,
        );
      }

      if (targetState === 'REPROCESSING') {
        throw new ReprocessNotAllowedError(
          documentId,
          `Document cannot be reprocessed in current state: ${currentWorkflowState}.`,
        );
      }

      // Default fallback
      throw new InvalidDocumentStateError(
        documentId,
        currentWorkflowState,
        allowed.join(' or '),
      );
    }
  }
}
