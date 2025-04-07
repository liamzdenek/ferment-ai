import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';

describe('Journal Components', () => {
  let journal: Journal;
  let entityId: string;

  beforeEach(() => {
    journal = createJournal();
    entityId = journal.createEntity();
  });

  test('should add and retrieve components', () => {
    const component = { type: 'TestComponent', value: 42 };
    
    journal.addComponent(entityId, 'TestComponent', component);
    
    const retrievedComponent = journal.getComponent(entityId, 'TestComponent');
    expect(retrievedComponent).toEqual(component);
  });
  
  test('should remove components', () => {
    const component = { type: 'TestComponent', value: 42 };
    
    journal.addComponent(entityId, 'TestComponent', component);
    journal.removeComponent(entityId, 'TestComponent');
    
    const retrievedComponent = journal.getComponent(entityId, 'TestComponent');
    expect(retrievedComponent).toBeUndefined();
  });
  
  test('should retrieve entities with specific components', () => {
    const entityId1 = journal.createEntity();
    const entityId2 = journal.createEntity();
    
    journal.addComponent(entityId1, 'TestComponent', { type: 'TestComponent', value: 42 });
    
    const entities = journal.getEntitiesWithComponent('TestComponent');
    expect(entities).toContain(entityId1);
    expect(entities).not.toContain(entityId2);
  });
  
  test('should throw error when adding component to non-existent entity', () => {
    const component = { type: 'TestComponent', value: 42 };
    
    expect(() => {
      journal.addComponent('non-existent-entity', 'TestComponent', component);
    }).toThrow('Entity non-existent-entity does not exist');
  });
  
  test('should publish events when adding and removing components', () => {
    const events: JournalEvent[] = [];
    
    journal.subscribe((event) => {
      if (event.type === EventType.COMPONENT) {
        events.push(event);
      }
    });
    
    const component = { type: 'TestComponent', value: 42 };
    journal.addComponent(entityId, 'TestComponent', component);
    journal.removeComponent(entityId, 'TestComponent');
    
    expect(events.length).toBeGreaterThanOrEqual(2);
    
    // Find the events we're interested in
    const addEvent = events.find(e =>
      e.payload.action === 'component_added' &&
      e.payload.entityId === entityId &&
      e.payload.componentType === 'TestComponent'
    );
    const removeEvent = events.find(e =>
      e.payload.action === 'component_removed' &&
      e.payload.entityId === entityId &&
      e.payload.componentType === 'TestComponent'
    );
    
    // Verify the events were found
    expect(addEvent).toBeDefined();
    expect(removeEvent).toBeDefined();
  });
});