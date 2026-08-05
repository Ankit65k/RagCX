import { Document } from '@prisma/client';
import { CompositeDocumentState, DocumentWorkflowState } from '../types/lifecycle.types.js';

/**
 * Interface contract for validating lifecycle state transitions.
 */
export interface IStateTransitionValidator {
  /**
   * Validates whether a transition from current composite state to target state is permitted.
   *
   * @throws {InvalidDocumentStateError} If the transition is prohibited.
   */
  validateTransition(
    currentState: CompositeDocumentState,
    targetState: DocumentWorkflowState,
    documentId: string,
  ): void;
}

/**
 * Interface contract for coordinating document lifecycle mutations.
 */
export interface IDocumentLifecycleService {
  /**
   * Soft deletes a document: validates state, marks status, deletes file, publishes event.
   */
  softDelete(id: string, userId: string): Promise<Document>;

  /**
   * Permanent deletes a document: removes metadata, storage, sessions, and publishes AI cleanup event.
   */
  permanentDelete(id: string, userId: string): Promise<void>;

  /**
   * Restores a deleted document back to uploaded/pending.
   */
  restore(id: string, userId: string): Promise<Document>;

  /**
   * Resets status to pending and triggers reprocessing.
   */
  reprocess(id: string, userId: string): Promise<Document>;

  /**
   * Archives a document (architecture ready).
   */
  archive(id: string, userId: string): Promise<Document>;
}
