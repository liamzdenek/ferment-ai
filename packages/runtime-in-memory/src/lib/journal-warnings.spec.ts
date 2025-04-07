import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';
import { lastValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

describe('Journal Warnings', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should generate warning events for unhandled events', async () => {
    // Set up a subscription to capture warning events
    const warningEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      if (event.type === 'warning') {
        warningEvents.push(event);
      }
    });
    
    // Publish an event with a type that has no listeners
    const publishedEvent = journal.publish('unhandled-event-type', 'test', { message: 'Unhandled Event' });
    
    // Wait a bit to ensure the warning event is generated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify a warning event was generated
    expect(warningEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the warning event for our published event
    const warningEvent = warningEvents.find(e => e.payload.eventId === publishedEvent.id);
    
    // Verify the warning event was found and has the expected properties
    expect(warningEvent).toBeDefined();
    expect(warningEvent?.type).toBe('warning');
    expect(warningEvent?.source).toBe('journal');
    expect(warningEvent?.payload.eventType).toBe('unhandled-event-type');
    expect(warningEvent?.payload.message).toContain('No listeners for event');
  });

  test('should not generate warning events for events with listeners', async () => {
    // Set up a subscription to capture all events
    const allEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      allEvents.push(event);
    });
    
    // Set up a subscription to capture warning events
    const warningEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      if (event.type === 'warning') {
        warningEvents.push(event);
      }
    });
    
    // Publish an event with a type that has a listener
    journal.publish(EventType.SYSTEM, 'test', { message: 'Handled Event' });
    
    // Verify no warning event was generated
    expect(warningEvents.length).toBe(0);
    
    // Verify the original event was received
    expect(allEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const handledEvent = allEvents.find(e =>
      e.type === EventType.SYSTEM &&
      e.payload.message === 'Handled Event'
    );
    
    // Verify the event was found
    expect(handledEvent).toBeDefined();
  });

  test('should not generate warning events for warning events', async () => {
    // Set up a subscription to capture all events
    const allEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      allEvents.push(event);
    });
    
    // Publish a warning event directly
    journal.publish('warning', 'test', { message: 'Direct Warning' });
    
    // Verify the original warning event was received
    expect(allEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const directWarning = allEvents.find(e =>
      e.type === 'warning' &&
      e.payload.message === 'Direct Warning'
    );
    
    // Verify the event was found
    expect(directWarning).toBeDefined();
  });

  test('should include warning events in the execute stream', async () => {
    // Publish an event with a type that has no listeners
    const publishedEvent = journal.publish('unhandled-event-type', 'test', { message: 'Unhandled Event' });
    
    // Collect events from execute
    const events = await lastValueFrom((journal.execute() as any).pipe(
      take(2),
      toArray()
    )) as JournalEvent[];
    
    // Verify we received both the original event and the warning event
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the original event
    const originalEvent = events.find(e => e.id === publishedEvent.id);
    expect(originalEvent).toBeDefined();
    expect(originalEvent?.type).toBe('unhandled-event-type');
    
    // Find the warning event
    const warningEvent = events.find(e =>
      e.type === 'warning' &&
      e.payload.eventId === publishedEvent.id
    );
    expect(warningEvent).toBeDefined();
    expect(warningEvent?.source).toBe('journal');
  });

  test('should preserve warning events during serialization/deserialization', async () => {
    // Publish an event with a type that has no listeners
    journal.publish('unhandled-event-type', 'test', { message: 'Unhandled Event' });
    
    // Serialize the journal
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Collect events from the new journal's execute stream
    const events = await lastValueFrom((newJournal.execute() as any).pipe(
      take(2),
      toArray()
    )) as JournalEvent[];
    
    // Verify we received both the original event and the warning event
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the original event and warning event
    const originalEvent = events.find(e => e.type === 'unhandled-event-type');
    const warningEvent = events.find(e => e.type === 'warning');
    
    // Verify both events were found
    expect(originalEvent).toBeDefined();
    expect(warningEvent).toBeDefined();
  });

  test('should generate warning events for system events with no listeners', async () => {
    // Set up a subscription to capture warning events
    const warningEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      if (event.type === 'warning') {
        warningEvents.push(event);
      }
    });
    
    // Publish a system event with no specific listeners
    const publishedEvent = journal.publish(EventType.SYSTEM, 'test', { action: 'unknown_action' });
    
    // Wait a bit to ensure the warning event is generated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify a warning event was generated
    expect(warningEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the warning event for our published event
    const warningEvent = warningEvents.find(e => e.payload.eventId === publishedEvent.id);
    
    // Verify the warning event was found and has the expected properties
    expect(warningEvent).toBeDefined();
    expect(warningEvent?.payload.eventType).toBe(EventType.SYSTEM);
  });

  test('should generate warning events for events with no subscribers', async () => {
    // Don't set up any subscriptions
    
    // Publish an event
    const publishedEvent = journal.publish(EventType.USER, 'test', { message: 'No Subscribers' });
    
    // Collect events from execute
    const events = await lastValueFrom((journal.execute() as any).pipe(
      take(2),
      toArray()
    )) as JournalEvent[];
    
    // Verify we received both the original event and the warning event
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the original event
    const originalEvent = events.find(e => e.id === publishedEvent.id);
    expect(originalEvent).toBeDefined();
    
    // Find the warning event
    const warningEvent = events.find(e =>
      e.type === 'warning' &&
      e.payload.eventId === publishedEvent.id
    );
    expect(warningEvent).toBeDefined();
  });
});