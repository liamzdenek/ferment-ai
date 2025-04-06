import { createJournal } from './journal-factory.js';
import { EventType, Journal, JournalEvent } from '@ferment-ai/runtime-interfaces';

describe('JournalImpl', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  describe('Event Publication and Subscription', () => {
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
      describe('Entity Management', () => {
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
      
      describe('Component Management', () => {
        let entityId: string;
        
        beforeEach(() => {
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
          
          expect(events.length).toBe(2);
          expect(events[0].payload.action).toBe('component_added');
          expect(events[0].payload.entityId).toBe(entityId);
          expect(events[0].payload.componentType).toBe('TestComponent');
          expect(events[1].payload.action).toBe('component_removed');
          expect(events[1].payload.entityId).toBe(entityId);
          expect(events[1].payload.componentType).toBe('TestComponent');
        });
      });
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
});