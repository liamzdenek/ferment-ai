import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';

describe('Journal Entities', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should create and retrieve entities', () => {
    const entityId = journal.createEntity();
    
    const entity = journal.getEntity(entityId);
    
    expect(entity).toBeDefined();
    expect(entity?.id).toBe(entityId);
  });
  
  test('should remove entities', () => {
    const entityId = journal.createEntity();
    
    journal.removeEntity(entityId);
    
    const entity = journal.getEntity(entityId);
    expect(entity).toBeUndefined();
  });
  
  test('should publish events when creating and removing entities', () => {
    const events: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      if (event.type === EventType.ENTITY) {
        events.push(event);
      }
    });
    
    const entityId = journal.createEntity();
    journal.removeEntity(entityId);
    
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const createEvent = events.find(e =>
      e.payload.action === 'entity_created' &&
      e.payload.entityId === entityId
    );
    const removeEvent = events.find(e =>
      e.payload.action === 'entity_removed' &&
      e.payload.entityId === entityId
    );
    
    // Verify the events were found
    expect(createEvent).toBeDefined();
    expect(removeEvent).toBeDefined();
  });
});