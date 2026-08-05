import { BusEvent } from '../../event-bus/interfaces/event-bus.interface.js';
import { logger } from '../../../logger/logger.js';
import { UnknownEventError } from '../errors/event-consumer.errors.js';
import type { IEventDispatcher, IEventHandler } from '../interfaces/event-consumer.interface.js';

/**
 * `EventDispatcher` — registry and routing map for incoming event handlers.
 */
export class EventDispatcher implements IEventDispatcher {
  private readonly handlers: Map<string, IEventHandler> = new Map();

  /**
   * Registers a handler for a given event type.
   */
  register(eventType: string, handler: IEventHandler): void {
    if (this.handlers.has(eventType)) {
      logger.warn({ eventType }, 'EventDispatcher: overriding registered handler');
    }
    this.handlers.set(eventType, handler);
    logger.info({ eventType }, 'EventDispatcher: registered event handler');
  }

  /**
   * Routes the validated event payload to the matching handler.
   */
  async dispatch(event: BusEvent): Promise<void> {
    const handler = this.handlers.get(event.eventType);
    if (!handler) {
      throw new UnknownEventError(event.eventType);
    }

    logger.debug(
      { eventId: event.eventId, eventType: event.eventType },
      'EventDispatcher: dispatching event to handler',
    );

    await handler.handle(event);
  }
}
