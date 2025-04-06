import { createJournal } from './journal-factory.js';
import { EventType, Journal, Process, SystemStateComponent } from '@ferment-ai/runtime-interfaces';
import { v4 as uuidv4 } from 'uuid';

describe('Journal Serialization', () => {
  let journal: Journal;

  beforeEach(() => {
    journal = createJournal();
  });

  test('should serialize and deserialize events', () => {
    // Add some events
    journal.publish(EventType.SYSTEM, 'test', { message: 'System event' });
    journal.publish(EventType.USER, 'test', { message: 'User event' });
    
    // Serialize
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Verify events were preserved
    const events = newJournal.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].type).toBe(EventType.SYSTEM);
    expect(events[0].payload.message).toBe('System event');
    expect(events[1].type).toBe(EventType.USER);
    expect(events[1].payload.message).toBe('User event');
  });
  
  test('should serialize and deserialize entities and components', () => {
    // Create entities and add components
    const entityId1 = journal.createEntity();
    const entityId2 = journal.createEntity();
    
    journal.addComponent(entityId1, 'TestComponent', { type: 'TestComponent', value: 42 });
    journal.addComponent(entityId2, 'OtherComponent', { type: 'OtherComponent', name: 'test' });
    
    // Serialize
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Verify entities were preserved
    const entity1 = newJournal.getEntity(entityId1);
    const entity2 = newJournal.getEntity(entityId2);
    
    expect(entity1).toBeDefined();
    expect(entity1?.id).toBe(entityId1);
    expect(entity2).toBeDefined();
    expect(entity2?.id).toBe(entityId2);
    
    // Verify components were preserved
    const component1 = newJournal.getComponent<any>(entityId1, 'TestComponent');
    const component2 = newJournal.getComponent<any>(entityId2, 'OtherComponent');
    
    expect(component1).toBeDefined();
    expect(component1?.type).toBe('TestComponent');
    expect(component1?.value).toBe(42);
    
    expect(component2).toBeDefined();
    expect(component2?.type).toBe('OtherComponent');
    expect(component2?.name).toBe('test');
  });
  
  test('should serialize and deserialize systems', () => {
    // Register a system
    const system = {
      id: 'test-system',
      eventTypes: [EventType.SYSTEM],
      initialState: { count: 0 },
      execute: async () => {}
    };
    
    journal.registerSystem(system);
    
    // Serialize
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Verify system state was preserved
    const entities = newJournal.getEntitiesWithComponent('SystemStateComponent');
    expect(entities.length).toBe(1);
    
    const component = newJournal.getComponent<SystemStateComponent>(entities[0], 'SystemStateComponent');
    expect(component).toBeDefined();
    expect(component?.systemId).toBe('test-system');
    expect(component?.state).toEqual({ count: 0 });
  });
  
  test('should serialize and deserialize processes', () => {
    // Create processes
    const process1: Process = {
      id: uuidv4(),
      type: 'test-process-1',
      status: 'created',
      startTime: Date.now()
    };
    
    const process2: Process = {
      id: uuidv4(),
      type: 'test-process-2',
      status: 'completed',
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      result: {
        success: true,
        data: { value: 42 }
      }
    };
    
    journal.createProcess(process1);
    journal.createProcess(process2);
    
    // Serialize
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Verify processes were preserved
    const retrievedProcess1 = newJournal.getProcess(process1.id);
    const retrievedProcess2 = newJournal.getProcess(process2.id);
    
    expect(retrievedProcess1).toEqual(process1);
    expect(retrievedProcess2).toEqual(process2);
  });
  
  test('should serialize and deserialize bound constructs', () => {
    // Mark constructs as bound
    journal.markConstructAsBound('construct-1');
    journal.markConstructAsBound('construct-2');
    
    // Serialize
    const serialized = journal.serialize();
    
    // Create a new journal and deserialize
    const newJournal = createJournal();
    newJournal.deserialize(serialized);
    
    // Verify bound constructs were preserved
    // Note: We can't directly access boundConstructs, so we'll check indirectly
    // by publishing events and checking if the events were published
    
    const events = newJournal.getFilteredEvents({ type: EventType.SYSTEM });
    const boundEvents = events.filter(e => e.payload.action === 'construct_bound');
    
    expect(boundEvents.length).toBe(2);
    expect(boundEvents[0].payload.constructId).toBe('construct-1');
    expect(boundEvents[1].payload.constructId).toBe('construct-2');
  });
  
  test('should clear the journal', () => {
    // Add some data
    journal.createEntity();
    journal.publish(EventType.SYSTEM, 'test', { message: 'Test event' });
    
    // Clear the journal
    journal.clear();
    
    // Verify everything was cleared
    expect(journal.getEvents().length).toBe(0);
    expect(journal.getEntitiesWithComponent('TestComponent').length).toBe(0);
    expect(journal.getProcesses().size).toBe(0);
  });
});