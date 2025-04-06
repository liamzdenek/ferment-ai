import { EventFilter, EventListener, EventType, Journal, JournalEvent, JournalOptions } from '@ferment-ai/runtime-common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Implementation of the Journal interface
 */
export class JournalImpl implements Journal {
  /**
   * The events in the journal
   */
  private events: JournalEvent[] = [];

  /**
   * The event listeners
   */
  private listeners: Map<string, { listener: EventListener; filter?: EventFilter }> = new Map();

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
    this.events = options.initialEvents ?? [];
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
  public subscribe(listener: EventListener, filter?: EventFilter): string {
    const id = uuidv4();
    this.listeners.set(id, { listener, filter });
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
  public getFilteredEvents(filter?: EventFilter): JournalEvent[] {
    if (!filter) {
      return this.getEvents();
    }

    return this.events.filter((event) => {
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
    });
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  public serialize(): string {
    return JSON.stringify(this.events);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  public deserialize(data: string): void {
    this.events = JSON.parse(data);
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
   * @param event The event to notify listeners about
   */
  private notifyListeners(event: JournalEvent): void {
    for (const { listener, filter } of this.listeners.values()) {
      if (this.eventMatchesFilter(event, filter)) {
        listener(event);
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
  private eventMatchesFilter(event: JournalEvent, filter?: EventFilter): boolean {
    if (!filter) {
      return true;
    }

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