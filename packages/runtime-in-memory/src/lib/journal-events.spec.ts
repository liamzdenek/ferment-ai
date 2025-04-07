import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';

describe('Journal Events', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should publish events with correct properties', () => {
    const event = journal.publish(EventType.SYSTEM, 'test-source', { data: 'test-data' }, 'test-target');
    
    expect(event.id).toBeDefined();
    expect(event.type).toBe(EventType.SYSTEM);
    expect(event.source).toBe('test-source');
    expect(event.target).toBe('test-target');
    expect(event.payload).toEqual({ data: 'test-data' });
    expect(event.timestamp).toBeDefined();
  });

  test('should subscribe to all events', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Test event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Test event 2' });
    
    expect(receivedEvents.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const event1 = receivedEvents.find(e => e.payload.message === 'Test event 1');
    const event2 = receivedEvents.find(e => e.payload.message === 'Test event 2');
    
    // Verify the events were found
    expect(event1).toBeDefined();
    expect(event2).toBeDefined();
  });

  test('should filter events by type', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { type: EventType.SYSTEM });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'System event' });
    journal.publish(EventType.USER, 'test', { message: 'User event' });
    
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const systemEvent = receivedEvents.find(e =>
      e.type === EventType.SYSTEM &&
      e.payload.message === 'System event'
    );
    
    // Verify the event was found
    expect(systemEvent).toBeDefined();
    
    // Verify no USER events were received
    const userEvent = receivedEvents.find(e => e.type === EventType.USER);
    expect(userEvent).toBeUndefined();
  });

  test('should filter events by source', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { source: 'source-a' });
    
    journal.publish(EventType.SYSTEM, 'source-a', { message: 'Source A event' });
    journal.publish(EventType.SYSTEM, 'source-b', { message: 'Source B event' });
    
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const sourceAEvent = receivedEvents.find(e =>
      e.source === 'source-a' &&
      e.payload.message === 'Source A event'
    );
    
    // Verify the event was found
    expect(sourceAEvent).toBeDefined();
    
    // Verify no source-b events were received
    const sourceBEvent = receivedEvents.find(e => e.source === 'source-b');
    expect(sourceBEvent).toBeUndefined();
  });

  test('should filter events by target', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { target: 'target-a' });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Target A event' }, 'target-a');
    journal.publish(EventType.SYSTEM, 'test', { message: 'Target B event' }, 'target-b');
    
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const targetAEvent = receivedEvents.find(e =>
      e.target === 'target-a' &&
      e.payload.message === 'Target A event'
    );
    
    // Verify the event was found
    expect(targetAEvent).toBeDefined();
    
    // Verify no target-b events were received
    const targetBEvent = receivedEvents.find(e => e.target === 'target-b');
    expect(targetBEvent).toBeUndefined();
  });

  test('should unsubscribe from events', () => {
    const receivedEvents: JournalEvent[] = [];
    
    const subscriptionId = journal.subscribe((event) => {
      receivedEvents.push(event);
    });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    
    journal.unsubscribe(subscriptionId);
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 2' });
    
    // We should only have received the first event
    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the events we're interested in
    const event1 = receivedEvents.find(e => e.payload.message === 'Event 1');
    const event2 = receivedEvents.find(e => e.payload.message === 'Event 2');
    
    // Verify event1 was received but event2 was not
    expect(event1).toBeDefined();
    expect(event2).toBeUndefined();
  });

  test('should retrieve all events', () => {
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Event 2' });
    
    const events = journal.getEvents();
    
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const event1 = events.find(e => e.payload.message === 'Event 1');
    const event2 = events.find(e => e.payload.message === 'Event 2');
    
    // Verify the events were found
    expect(event1).toBeDefined();
    expect(event2).toBeDefined();
  });

  test('should retrieve filtered events', () => {
    journal.publish(EventType.SYSTEM, 'test', { message: 'System event' });
    journal.publish(EventType.USER, 'test', { message: 'User event' });
    
    const systemEvents = journal.getFilteredEvents({ type: EventType.SYSTEM });
    
    expect(systemEvents.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const systemEvent = systemEvents.find(e =>
      e.type === EventType.SYSTEM &&
      e.payload.message === 'System event'
    );
    
    // Verify the event was found
    expect(systemEvent).toBeDefined();
    
    // Verify no USER events were included
    const userEvent = systemEvents.find(e => e.type === EventType.USER);
    expect(userEvent).toBeUndefined();
  });
});