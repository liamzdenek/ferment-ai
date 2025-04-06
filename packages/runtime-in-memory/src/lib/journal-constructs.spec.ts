import { createJournal } from './journal-factory.js';
import { EventType, Journal } from '@ferment-ai/runtime-interfaces';
import { RootConstruct, Construct } from 'constructs';

describe('Journal Construct Binding', () => {
  let journal: Journal;
  let rootConstruct: RootConstruct;

  beforeEach(() => {
    journal = createJournal();
    rootConstruct = new RootConstruct('root');
  });

  test('should mark constructs as bound', () => {
    journal.markConstructAsBound('construct-1');
    
    // Verify by checking events
    const events = journal.getFilteredEvents({ type: EventType.SYSTEM });
    const boundEvent = events.find(e => e.payload.action === 'construct_bound');
    
    expect(boundEvent).toBeDefined();
    expect(boundEvent?.payload.constructId).toBe('construct-1');
  });
  
  test('should validate all constructs are bound', () => {
    // Create a simple construct tree
    const child1 = new Construct(rootConstruct, 'child1');
    const child2 = new Construct(rootConstruct, 'child2');
    const grandchild = new Construct(child1, 'grandchild');
    
    // Mark all constructs as bound
    journal.markConstructAsBound(rootConstruct.node.id);
    journal.markConstructAsBound(child1.node.id);
    journal.markConstructAsBound(child2.node.id);
    journal.markConstructAsBound(grandchild.node.id);
    
    // Validation should pass
    expect(() => {
      journal.validateAllConstructsBound(rootConstruct);
    }).not.toThrow();
  });
  
  test('should throw error when constructs are not bound', () => {
    // Create a simple construct tree
    const child1 = new Construct(rootConstruct, 'child1');
    const child2 = new Construct(rootConstruct, 'child2');
    const grandchild = new Construct(child1, 'grandchild');
    
    // Mark only some constructs as bound
    journal.markConstructAsBound(rootConstruct.node.id);
    journal.markConstructAsBound(child1.node.id);
    // Deliberately not binding child2 and grandchild
    
    // Validation should fail
    expect(() => {
      journal.validateAllConstructsBound(rootConstruct);
    }).toThrow();
  });
  
  test('should not include root construct in validation', () => {
    // Create a simple construct tree
    const child1 = new Construct(rootConstruct, 'child1');
    
    // Mark only child constructs as bound, not the root
    journal.markConstructAsBound(child1.node.id);
    
    // Validation should pass because root is excluded
    expect(() => {
      journal.validateAllConstructsBound(rootConstruct);
    }).not.toThrow();
  });
});