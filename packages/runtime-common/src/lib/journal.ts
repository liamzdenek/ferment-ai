/**
 * Type of journal event
 */
export enum EventType {
  /**
   * System event
   */
  SYSTEM = 'system',

  /**
   * Agent event
   */
  AGENT = 'agent',

  /**
   * Tool event
   */
  TOOL = 'tool',

  /**
   * User event
   */
  USER = 'user',
}

/**
 * Journal event
 */
export interface JournalEvent {
  /**
   * Event ID
   */
  id: string;

  /**
   * Event type
   */
  type: EventType;

  /**
   * Event source
   */
  source: string;

  /**
   * Event target
   */
  target?: string;

  /**
   * Event timestamp
   */
  timestamp: number;

  /**
   * Event payload
   */
  payload: Record<string, any>;
}

/**
 * Journal event listener
 */
export type EventListener = (event: JournalEvent) => void;

/**
 * Journal event filter
 */
export interface EventFilter {
  /**
   * Event type to filter
   */
  type?: EventType;

  /**
   * Event source to filter
   */
  source?: string;

  /**
   * Event target to filter
   */
  target?: string;
}

/**
 * Journal options
 */
export interface JournalOptions {
  /**
   * Initial events
   */
  initialEvents?: JournalEvent[];

  /**
   * Whether to enable compression
   */
  enableCompression?: boolean;
}

/**
 * Journal is the central source of truth for the entire system.
 * 
 * It contains all data needed to reconstruct agent contexts and continue execution.
 * It operates on a pub-sub model and is append-only during execution.
 */
export interface Journal {
  /**
   * Publishes an event to the journal
   * 
   * @param type The event type
   * @param source The event source
   * @param payload The event payload
   * @param target The event target
   * @returns The published event
   */
  publish(
    type: EventType,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): JournalEvent;

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(listener: EventListener, filter?: EventFilter): string;

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  unsubscribe(id: string): void;

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  getEvents(): JournalEvent[];

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  getFilteredEvents(filter?: EventFilter): JournalEvent[];

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  serialize(): string;

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  deserialize(data: string): void;

  /**
   * Clears all events from the journal
   */
  clear(): void;
}