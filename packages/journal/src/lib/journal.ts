import { v4 as uuidv4 } from 'uuid';

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
export class Journal {
  /**
   * Events in the journal
   */
  private events: JournalEvent[] = [];

  /**
   * Event listeners
   */
  private listeners: Map<string, { filter: EventFilter; listener: EventListener }> = new Map();

  /**
   * Whether compression is enabled
   */
  private readonly enableCompression: boolean;

  /**
   * Creates a new Journal
   *
   * @param options The journal options
   */
  constructor(options: JournalOptions = {}) {
    if (options.initialEvents) {
      this.events = [...options.initialEvents];
    }

    this.enableCompression = options.enableCompression ?? false;
  }

  /**
   * Publishes an event to the journal
   * 
   * @param type The event type
   * @param source The event source
   * @param payload The event payload
   * @param target The event target
   * @returns The published event
   */
  public publish(
    type: EventType,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): JournalEvent {
    const event: JournalEvent = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload,
    };

    this.events.push(event);
    this.notifyListeners(event);

    return event;
  }

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribe(listener: EventListener, filter: EventFilter = {}): string {
    const id = uuidv4();
    this.listeners.set(id, { filter, listener });
    return id;
  }

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  public unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  public getEvents(): JournalEvent[] {
    return [...this.events];
  }

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  public getFilteredEvents(filter: EventFilter = {}): JournalEvent[] {
    return this.events.filter((event) => this.matchesFilter(event, filter));
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  public serialize(): string {
    const data = {
      events: this.events,
    };

    if (this.enableCompression) {
      // In a real implementation, we would compress the data here
      return JSON.stringify(data);
    }

    return JSON.stringify(data);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  public deserialize(data: string): void {
    const parsed = JSON.parse(data);

    if (this.enableCompression) {
      // In a real implementation, we would decompress the data here
    }

    this.events = parsed.events || [];
  }

  /**
   * Clears all events from the journal
   */
  public clear(): void {
    this.events = [];
  }

  /**
   * Notifies listeners of an event
   * 
   * @param event The event to notify about
   */
  private notifyListeners(event: JournalEvent): void {
    for (const { filter, listener } of this.listeners.values()) {
      if (this.matchesFilter(event, filter)) {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Checks if an event matches a filter
   * 
   * @param event The event to check
   * @param filter The filter to check against
   * @returns Whether the event matches the filter
   */
  private matchesFilter(event: JournalEvent, filter: EventFilter): boolean {
    if (filter.type && event.type !== filter.type) {
      return false;
    }

    if (filter.source && event.source !== filter.source) {
      return false;
    }

    if (filter.target && event.target !== filter.target) {
      return false;
    }

    return true;
  }
}
