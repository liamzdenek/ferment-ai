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
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('test');
    expect(events[0].source).toBe('source');
    expect(events[0].payload.message).toBe('Test event');
  });
  
  test('should create a journal with compression enabled', () => {
    const journal = createJournal({
      enableCompression: true
    });
    
    expect(journal).toBeDefined();
    
    // Note: We can't directly test compression, but we can verify the journal works
    journal.publish('test', 'source', { message: 'Test event' });
    
    const events = journal.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('test');
  });
});