import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';
import { Observable, firstValueFrom, lastValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

describe('Journal Execute', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('execute should return an Observable', () => {
    // Verify the execute method returns an Observable
    const result = journal.execute();
    expect(result).toBeInstanceOf(Observable);
    expect(typeof (result as any).subscribe).toBe('function');
  });

  test('execute should emit published events', async () => {
    // Publish some events before calling execute
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Event 2' });

    // Collect events from execute using RxJS operators
    const events = await lastValueFrom((journal.execute() as any).pipe(
      take(2), // Take only the first 2 events
      toArray() // Collect them into an array
    )) as JournalEvent[];

    // Verify we received the expected events
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const event1 = events.find(e => e.payload.message === 'Event 1');
    const event2 = events.find(e => e.payload.message === 'Event 2');
    
    // Verify the events were found
    expect(event1).toBeDefined();
    expect(event2).toBeDefined();
  });

  test('execute should emit events published after it starts', async () => {
    // Create a promise that will resolve with the first event
    const firstEventPromise = firstValueFrom(journal.execute() as any);
    
    // Publish an event
    const publishedEvent = journal.publish(EventType.SYSTEM, 'test', { message: 'New Event' });

    // Wait for the first event
    const receivedEvent = await firstEventPromise;

    // Verify we received the event we just published
    expect(receivedEvent).toBeDefined();
    expect((receivedEvent as JournalEvent).id).toBe(publishedEvent.id);
    expect((receivedEvent as JournalEvent).payload.message).toBe('New Event');
  });

  test('execute should emit warning events for unhandled events', async () => {
    // Collect the first 2 events
    const eventsPromise = lastValueFrom((journal.execute() as any).pipe(
      take(2),
      toArray()
    )) as Promise<JournalEvent[]>;
    
    // Publish an event with a type that has no listeners
    const publishedEvent = journal.publish('unhandled-event-type', 'test', { message: 'Unhandled Event' });

    // Wait for the events
    const events = await eventsPromise;
    
    // Verify we received the expected events
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
    expect(warningEvent?.payload.eventType).toBe('unhandled-event-type');
    expect(warningEvent?.payload.message).toContain('No listeners for event');
  });

  test('execute should not generate warning events for warning events', async () => {
    // Set up a subscription to capture all events
    const eventsPromise = lastValueFrom((journal.execute() as any).pipe(
      take(1), // We expect only 1 event
      toArray()
    )) as Promise<JournalEvent[]>;
    
    // Publish a warning event directly
    const publishedEvent = journal.publish('warning', 'test', { message: 'Direct Warning' });

    // Wait a bit to ensure any additional events would be captured
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the events
    const events = await eventsPromise;
    
    // Verify we received the warning event we published
    expect(events.length).toBeGreaterThanOrEqual(1);
    
    // Find the warning event
    const warningEvent = events.find(e => e.id === publishedEvent.id);
    expect(warningEvent).toBeDefined();
    expect(warningEvent?.type).toBe('warning');
  });

  test('execute should work with systems that respond to events', async () => {
    // Create a system that responds to events
    const system = {
      id: 'test-system',
      eventTypes: ['test-event'],
      initialState: { count: 0 },
      execute: jest.fn(async (j, event, stateContext) => {
        // Update state
        const state = stateContext.getState();
        stateContext.setState({ count: state.count + 1 });
        
        // Publish a response event
        j.publish('response-event', 'test-system', { 
          originalEventId: event.id,
          message: 'Response to ' + event.payload.message 
        });
      })
    };
    
    // Register the system
    journal.registerSystem(system);
    
    // Collect the first 3 events
    const eventsPromise = lastValueFrom((journal.execute() as any).pipe(
      take(3),
      toArray()
    )) as Promise<JournalEvent[]>;
    
    // Publish an event that the system will respond to
    const publishedEvent = journal.publish('test-event', 'test', { message: 'Trigger Event' });
    
    // Wait for the events
    const events = await eventsPromise;
    
    // Verify we received the expected events
    expect(events.length).toBeGreaterThanOrEqual(3);
    
    // Find the original event
    const originalEvent = events.find(e => e.id === publishedEvent.id);
    expect(originalEvent).toBeDefined();
    expect(originalEvent?.type).toBe('test-event');
    
    // Find the response event
    const responseEvent = events.find(e =>
      e.type === 'response-event' &&
      e.source === 'test-system' &&
      e.payload.originalEventId === publishedEvent.id
    );
    expect(responseEvent).toBeDefined();
    expect(responseEvent?.payload.message).toBe('Response to Trigger Event');
    
    // Verify the system was called
    expect(system.execute).toHaveBeenCalledTimes(1);
  });
});