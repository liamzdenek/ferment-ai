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
    
    expect(events.length).toBe(2);
    expect(events[0].payload.action).toBe('entity_created');
    expect(events[0].payload.entityId).toBe(entityId);
    expect(events[1].payload.action).toBe('entity_removed');
    expect(events[1].payload.entityId).toBe(entityId);
  });
});