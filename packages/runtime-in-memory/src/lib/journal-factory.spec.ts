import { createJournal } from './journal-factory.js';
import { Journal } from '@ferment-ai/runtime-interfaces';

describe('Journal Factory', () => {
  test('should create a journal with default options', () => {
    const journal = createJournal();
    
    expect(journal).toBeDefined();
    expect(journal.getEvents()).toEqual([]);
    expect(journal.getProcesses().size).toBe(0);
  });
  
  test('should create a journal with initial state', () => {
    // Create a journal and add some data
    const originalJournal = createJournal();
    originalJournal.publish('test', 'source', { message: 'Test event' });
    
    // Serialize the journal
    const serialized = originalJournal.serialize();
    
    // Create a new journal with the serialized state
    const journal = createJournal({
      initialState: JSON.parse(serialized)
    });
    
    // Verify the state was preserved
    const events = journal.getEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const testEvent = events.find(e =>
      e.type === 'test' &&
      e.source === 'source' &&
      e.payload.message === 'Test event'
    );
    
    // Verify the event was found
    expect(testEvent).toBeDefined();
  });
  
  test('should create a journal with compression enabled', () => {
    const journal = createJournal({
      enableCompression: true
    });
    
    expect(journal).toBeDefined();
    
    // Note: We can't directly test compression, but we can verify the journal works
    journal.publish('test', 'source', { message: 'Test event' });
    
    const events = journal.getEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    
    // Find the event we're interested in
    const testEvent = events.find(e => e.type === 'test');
    
    // Verify the event was found
    expect(testEvent).toBeDefined();
  });
});