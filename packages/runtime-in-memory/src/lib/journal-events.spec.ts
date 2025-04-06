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
    
    expect(receivedEvents.length).toBe(2);
    expect(receivedEvents[0].payload.message).toBe('Test event 1');
    expect(receivedEvents[1].payload.message).toBe('Test event 2');
  });

  test('should filter events by type', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { type: EventType.SYSTEM });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'System event' });
    journal.publish(EventType.USER, 'test', { message: 'User event' });
    
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].type).toBe(EventType.SYSTEM);
    expect(receivedEvents[0].payload.message).toBe('System event');
  });

  test('should filter events by source', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { source: 'source-a' });
    
    journal.publish(EventType.SYSTEM, 'source-a', { message: 'Source A event' });
    journal.publish(EventType.SYSTEM, 'source-b', { message: 'Source B event' });
    
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].source).toBe('source-a');
    expect(receivedEvents[0].payload.message).toBe('Source A event');
  });

  test('should filter events by target', () => {
    const receivedEvents: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      receivedEvents.push(event);
    }, { target: 'target-a' });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Target A event' }, 'target-a');
    journal.publish(EventType.SYSTEM, 'test', { message: 'Target B event' }, 'target-b');
    
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].target).toBe('target-a');
    expect(receivedEvents[0].payload.message).toBe('Target A event');
  });

  test('should unsubscribe from events', () => {
    const receivedEvents: JournalEvent[] = [];
    
    const subscriptionId = journal.subscribe((event) => {
      receivedEvents.push(event);
    });
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    
    journal.unsubscribe(subscriptionId);
    
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 2' });
    
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].payload.message).toBe('Event 1');
  });

  test('should retrieve all events', () => {
    journal.publish(EventType.SYSTEM, 'test', { message: 'Event 1' });
    journal.publish(EventType.USER, 'test', { message: 'Event 2' });
    
    const events = journal.getEvents();
    
    expect(events.length).toBe(2);
    expect(events[0].payload.message).toBe('Event 1');
    expect(events[1].payload.message).toBe('Event 2');
  });

  test('should retrieve filtered events', () => {
    journal.publish(EventType.SYSTEM, 'test', { message: 'System event' });
    journal.publish(EventType.USER, 'test', { message: 'User event' });
    
    const systemEvents = journal.getFilteredEvents({ type: EventType.SYSTEM });
    
    expect(systemEvents.length).toBe(1);
    expect(systemEvents[0].type).toBe(EventType.SYSTEM);
    expect(systemEvents[0].payload.message).toBe('System event');
  });
});