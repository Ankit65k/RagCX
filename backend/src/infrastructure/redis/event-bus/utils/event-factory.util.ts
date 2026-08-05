import type {
  BusEvent,
  EventType,
  EventFactoryOptions,
} from '../interfaces/event-bus.interface.js';
import {
  DEFAULT_PRODUCER,
  CURRENT_SCHEMA_VERSION,
} from '../constants/event-bus.constants.js';
import { CorrelationIdGenerator } from './correlation-id.util.js';
import { EventMetadataBuilder } from './event-metadata-builder.util.js';

/**
 * `EventFactory` — creates fully hydrated and immutable event envelopes.
 */
export class EventFactory {
  /**
   * Creates a frozen BusEvent envelope.
   */
  static create<TPayload>(
    eventType: EventType,
    payload: TPayload,
    options: EventFactoryOptions,
  ): BusEvent<TPayload> {
    const producer = options.producer ?? DEFAULT_PRODUCER;
    const version  = options.version  ?? CURRENT_SCHEMA_VERSION;

    return Object.freeze<BusEvent<TPayload>>({
      eventId:       CorrelationIdGenerator.generateEventId(),
      eventType,
      version,
      timestamp:     new Date().toISOString(),
      correlationId: options.correlationId,
      requestId:     options.requestId,
      producer,
      payload,
      metadata:      EventMetadataBuilder.build(producer),
    });
  }

  /**
   * Clones an event with an updated retry count and fresh publish timestamp.
   */
  static withRetryCount<TPayload>(
    event: BusEvent<TPayload>,
    retryCount: number,
  ): BusEvent<TPayload> {
    return Object.freeze<BusEvent<TPayload>>({
      ...event,
      metadata: {
        ...event.metadata,
        retryCount,
        publishedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Convenience builder for system-generated events.
   */
  static createSystem<TPayload>(
    eventType: EventType,
    payload: TPayload,
    producer = DEFAULT_PRODUCER,
  ): BusEvent<TPayload> {
    const cid = CorrelationIdGenerator.generateCorrelationId();
    return EventFactory.create(eventType, payload, {
      correlationId: cid,
      requestId:     cid,
      producer,
    });
  }
}
