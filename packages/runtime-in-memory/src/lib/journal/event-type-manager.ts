import { z } from 'zod';
import { EventTypeDefinition } from '@ferment-ai/runtime-hooks';
import { BUILT_IN_EVENTS } from './built-in-events.js';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages event type definitions
 */
export class EventTypeManager {
  /**
   * Map of event types to their definitions
   */
  private eventTypes: Map<string, EventTypeDefinition<any>>;

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new EventTypeManager
   *
   * @param journal Reference to the journal implementation
   * @param initialEventTypes Initial event types
   */
  constructor(journal: JournalImpl, initialEventTypes: Map<string, EventTypeDefinition<any>> = new Map()) {
    this.journal = journal;
    this.eventTypes = new Map(initialEventTypes);

    // Register built-in event types
    for (const eventType of BUILT_IN_EVENTS) {
      this.registerEventType(eventType);
    }
  }

  /**
   * Registers an event type
   *
   * @param eventType The event type to register
   */
  registerEventType(eventType: EventTypeDefinition<any>): void {
    this.eventTypes.set(eventType.type, eventType);
  }

  /**
   * Checks if an event type is registered
   * 
   * @param eventType The event type to check
   * @returns Whether the event type is registered
   */
  isEventTypeRegistered<T extends z.ZodTypeAny>(eventType: EventTypeDefinition<T>): boolean {
    return this.eventTypes.has(eventType.type);
  }

  /**
   * Checks if an event type is registered by type string
   * 
   * @param type The event type string to check
   * @returns Whether the event type is registered
   */
  isTypeRegistered(type: string): boolean {
    return this.eventTypes.has(type);
  }

  /**
   * Gets all registered event types
   * 
   * @returns All registered event types
   */
  getAllEventTypes(): EventTypeDefinition<any>[] {
    return Array.from(this.eventTypes.values());
  }

  /**
   * Validates an event payload against its schema
   * 
   * @param eventType The event type definition
   * @param payload The event payload
   * @returns Whether the payload is valid
   */
  validateEventPayload<T extends z.ZodTypeAny>(
    eventType: EventTypeDefinition<T>,
    payload: Record<string, any>
  ): boolean {
    try {
      // Use safeParse instead of parse to avoid throwing
      const result = eventType.schema.safeParse(payload);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the event type definition for a type string
   * 
   * This is a helper method for backward compatibility
   * 
   * @param type The event type string
   * @returns The event type definition, or undefined if not found
   */
  getEventTypeByString<T extends z.ZodTypeAny = z.ZodTypeAny>(type: string): EventTypeDefinition<T> | undefined {
    return this.eventTypes.get(type) as EventTypeDefinition<T> | undefined;
  }
}