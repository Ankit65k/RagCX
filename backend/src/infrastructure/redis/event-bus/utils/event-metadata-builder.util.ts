import { appConfig } from '../../../../config/app.config.js';
import type { EventMetadata } from '../interfaces/event-bus.interface.js';
import { CURRENT_SCHEMA_VERSION } from '../constants/event-bus.constants.js';

/**
 * `EventMetadataBuilder` — builds cross-cutting metadata blocks for events.
 */
export class EventMetadataBuilder {
  /**
   * Constructs the metadata object for a new event publication.
   */
  static build(producer: string, retryCount = 0): EventMetadata {
    return {
      service:       producer,
      environment:   appConfig.env,
      publishedAt:   new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      retryCount,
    };
  }
}
