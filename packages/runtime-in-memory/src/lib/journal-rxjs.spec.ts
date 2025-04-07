import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';
import { lastValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

describe('Journal RxJS Integration', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should maintain event stream after serialization and deserialization', async () => {
    // Add some events to the journal
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Event 2' });
    
    // Serialize the journal
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    // Verify the events are available in the new journal's execute stream
    const events = await lastValueFrom((newJournal.execute()).pipe(
      take(2),
      toArray()
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

  test('should handle new events after deserialization', async () => {
    // Add an event to the journal
    journal.publish(EventType.SYSTEM, 'test', { message: 'Original Event' });
    
    // Serialize the journal
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Add a new event to the deserialized journal
    newJournal.publish(EventType.USER, 'test', { message: 'New Event' });
    
    // Verify both events are available in the new journal's execute stream
    const events = await lastValueFrom((newJournal.execute()).pipe(
      take(2),
      toArray()
    )) as JournalEvent[];
    
    // Verify we received the expected events
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const originalEvent = events.find(e => e.payload.message === 'Original Event');
    const newEvent = events.find(e => e.payload.message === 'New Event');
    
    // Verify the events were found
    expect(originalEvent).toBeDefined();
    expect(newEvent).toBeDefined();
  });

  test('should handle subscriptions after deserialization', async () => {
    // Create a new journal
    const journal = createJournal();
    
    // Add an event to the journal
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    
    // Serialize the journal
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Set up a subscription to the new journal
    const receivedEvents: JournalEvent[] = [];
    const subscriptionId = newJournal.subscribe((event) => {
      receivedEvents.push(event);
    });
    
    // Publish a new event
    newJournal.publish(EventType.USER, 'test', { message: 'Event 2' });
    
    // Verify the subscription received the new event
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const event2 = receivedEvents.find(e => e.payload.message === 'Event 2');
    
    // Verify the event was found
    expect(event2).toBeDefined();
    
    // Unsubscribe
    newJournal.unsubscribe(subscriptionId);
    
    // Publish another event
    newJournal.publish(EventType.SYSTEM, 'test', { message: 'Event 3' });
    
    // Verify the subscription did not receive the new event
    // We should only have the Event 2 message, not Event 3
    const event2InReceivedEvents = receivedEvents.find(e => e.payload.message === 'Event 2');
    const event3InReceivedEvents = receivedEvents.find(e => e.payload.message === 'Event 3');
    
    expect(event2InReceivedEvents).toBeDefined();
    expect(event3InReceivedEvents).toBeUndefined();
  });

  test('should clear RxJS streams when journal is cleared', async () => {
    // Add some events to the journal
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Event 2' });
    
    // Clear the journal
    journal.clear();
    
    // Set up a subscription to capture events
    const receivedEvents: JournalEvent[] = [];
    journal.subscribe((event) => {
      receivedEvents.push(event);
    });
    
    // Publish a new event
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 3' });
    
    // Verify the new event is received
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const event3 = receivedEvents.find(e => e.payload.message === 'Event 3');
    
    // Verify the event was found
    expect(event3).toBeDefined();
    
    // Verify the execute stream only has the new event
    const events = await lastValueFrom((journal.execute()).pipe(
      take(1),
      toArray()
    )) as JournalEvent[];
    expect(events.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const event3InStream = events.find(e => e.payload.message === 'Event 3');
    
    // Verify the event was found
    expect(event3InStream).toBeDefined();
  });

  test('should handle multiple subscribers to the same event stream', async () => {
    // Set up two subscriptions
    const receivedEvents1: JournalEvent[] = [];
    const receivedEvents2: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents1.push(event);
    });
    
    journal.subscribe((event) => {
      receivedEvents2.push(event);
    });
    
    // Publish an event
    journal.publish(EventType.SYSTEM, 'test', { message: 'Shared Event' });
    
    // Verify both subscriptions received the event
    expect(receivedEvents1.length).toBeGreaterThanOrEqual(1);
    expect(receivedEvents2.length).toBeGreaterThanOrEqual(1);
    
    // Find the events we're interested in
    const sharedEvent1 = receivedEvents1.find(e => e.payload.message === 'Shared Event');
    const sharedEvent2 = receivedEvents2.find(e => e.payload.message === 'Shared Event');
    
    // Verify the events were found
    expect(sharedEvent1).toBeDefined();
    expect(sharedEvent2).toBeDefined();
  });

  test('should handle filtered subscriptions correctly', async () => {
    // Set up filtered subscriptions
    const systemEvents: JournalEvent[] = [];
    const userEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      systemEvents.push(event);
    }, { type: EventType.SYSTEM });
    
    journal.subscribe((event) => {
      userEvents.push(event);
    }, { type: EventType.USER });
    
    // Publish events of different types
    journal.publish(EventType.SYSTEM, 'test', { message: 'System Event' });
    journal.publish(EventType.USER, 'test', { message: 'User Event' });
    journal.publish('custom', 'test', { message: 'Custom Event' });
    
    // Verify subscriptions received only the events they were filtered for
    expect(systemEvents.length).toBeGreaterThanOrEqual(1);
    expect(userEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the events we're interested in
    const systemEvent = systemEvents.find(e => e.payload.message === 'System Event');
    const userEvent = userEvents.find(e => e.payload.message === 'User Event');
    
    // Verify the events were found
    expect(systemEvent).toBeDefined();
    expect(userEvent).toBeDefined();
    
    // Verify no cross-contamination
    const systemInUser = userEvents.find(e => e.type === EventType.SYSTEM);
    const userInSystem = systemEvents.find(e => e.type === EventType.USER);
    const customInSystem = systemEvents.find(e => e.type === 'custom');
    const customInUser = userEvents.find(e => e.type === 'custom');
    
    expect(systemInUser).toBeUndefined();
    expect(userInSystem).toBeUndefined();
    expect(customInSystem).toBeUndefined();
    expect(customInUser).toBeUndefined();
  });
});