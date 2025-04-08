import { v4 as uuidv4 } from 'uuid';
import {
  JournalEvent,
  EventType,
  EventFilter,
  EventListener
} from '@ferment-ai/runtime-interfaces';
import { Subject, ReplaySubject, Subscription } from 'rxjs';
import { filter as rxFilter } from 'rxjs/operators';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages events in the journal
 */
export class EventManager {
  /**
   * Stream of all events (historical + live)
   */
  private allEvents$: ReplaySubject<JournalEvent>;

  /**
   * Stream of only new live events
   */
  private liveEvents$: Subject<JournalEvent>;

  /**
   * Map of subscription IDs to subscriptions
   */
  private subscriptions: Map<string, Subscription>;

  /**
   * All events in the journal
   */
  private events: JournalEvent[];

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new EventManager
   * 
   * @param journal Reference to the journal implementation
   * @param initialEvents Initial events
   */
  constructor(journal: JournalImpl, initialEvents: JournalEvent[] = []) {
    this.journal = journal;
    this.events = [...initialEvents];
    this.allEvents$ = new ReplaySubject<JournalEvent>();
    this.liveEvents$ = new Subject<JournalEvent>();
    this.subscriptions = new Map();

    // Pipe live events to all events
    this.liveEvents$.subscribe(this.allEvents$);

    // Emit initial events
    for (const event of this.events) {
      this.allEvents$.next(event);
    }
  }

  /**
   * Publishes an event
   * 
   * @param type The event type
   * @param source The event source
   * @param payload The event payload
   * @param target The event target
   * @returns The published event
   */
  publish(
    type: EventType | string,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): JournalEvent {
    // Create the event
    const event: JournalEvent = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload
    };

    // Store the event
    this.events.push(event);

    // Emit the event
    this.liveEvents$.next(event);

    return event;
  }

  /**
   * Publishes an event with validation
   * 
   * @param type The event type
   * @param source The event source
   * @param payload The event payload
   * @param target The event target
   * @returns The published event and whether validation succeeded
   */
  publishWithValidation(
    type: EventType | string,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): { event: JournalEvent, valid: boolean } {
    // Check if the event type is registered and validate the payload
    const valid = this.journal.validateEventPayload(type, payload);
    
    if (!valid) {
      // Publish an error event
      this.publish(
        'error',
        'event-manager',
        {
          message: `Invalid event: ${type}`,
          type,
          payload
        }
      );
      
      // Create the event anyway
      const event = this.publish(type, source, payload, target);
      return { event, valid: false };
    }
    
    // Create and return the event
    const event = this.publish(type, source, payload, target);
    return { event, valid: true };
  }

  /**
   * Subscribes to events
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(listener: EventListener, filter?: EventFilter): string {
    // Create a subscription ID
    const id = uuidv4();

    // Create a filtered observable
    const filtered$ = this.allEvents$.pipe(
      rxFilter(event => {
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
      })
    );

    // Subscribe to the filtered observable
    const subscription = filtered$.subscribe(listener);

    // Store the subscription
    this.subscriptions.set(id, subscription);

    return id;
  }

  /**
   * Unsubscribes from events
   * 
   * @param id The subscription ID
   */
  unsubscribe(id: string): void {
    // Get the subscription
    const subscription = this.subscriptions.get(id);

    if (subscription) {
      // Unsubscribe
      subscription.unsubscribe();

      // Remove the subscription
      this.subscriptions.delete(id);
    }
  }

  /**
   * Gets all events
   * 
   * @returns All events
   */
  getEvents(): JournalEvent[] {
    return [...this.events];
  }

  /**
   * Gets events that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  getFilteredEvents(filter?: EventFilter): JournalEvent[] {
    if (!filter) {
      return this.getEvents();
    }

    return this.getEvents().filter(event => {
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
   * Gets the observable stream of all events
   * 
   * @returns The observable stream of all events
   */
  getEventStream(): ReplaySubject<JournalEvent> {
    return this.allEvents$;
  }

  /**
   * Clears all events
   */
  clear(): void {
    this.events = [];
  }
}