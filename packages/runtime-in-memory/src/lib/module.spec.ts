import { initializeJournal } from './module.js';
import { RootConstruct, Construct } from 'constructs';
import { Journal, Module } from '@ferment-ai/runtime-interfaces';

describe('Module System', () => {
  let rootConstruct: RootConstruct;

  beforeEach(() => {
    rootConstruct = new RootConstruct('root');
  });

  test('should initialize journal with modules', async () => {
    // Create a simple module
    const module: Module = {
      id: 'test-module',
      version: '1.0.0',
      dependencies: [],
      initialize: async (construct, journal) => {
        // Mark the construct as bound
        journal.markConstructAsBound(construct.node.id);
      }
    };
    
    // Initialize the journal with the module
    const journal = await initializeJournal(rootConstruct, [module]);
    
    // Verify the journal was initialized
    expect(journal).toBeDefined();
    
    // Verify the module was initialized by checking events
    const events = journal.getFilteredEvents({ type: 'system' });
    const boundEvent = events.find(e => e.payload.action === 'construct_bound');
    
    expect(boundEvent).toBeDefined();
    expect(boundEvent?.payload.constructId).toBe(rootConstruct.node.id);
  });
  
  test('should check module dependencies', async () => {
    // Create modules with dependencies
    const moduleA: Module = {
      id: 'module-a',
      version: '1.0.0',
      dependencies: [
        { id: 'module-b', minVersion: '1.0.0' }
      ],
      initialize: async () => {}
    };
    
    const moduleB: Module = {
      id: 'module-b',
      version: '1.2.0',
      dependencies: [],
      initialize: async (construct, journal) => {
        journal.markConstructAsBound(construct.node.id);
      }
    };
    
    // Initialize the journal with the modules
    const journal = await initializeJournal(rootConstruct, [moduleA, moduleB]);
    
    // Verify the journal was initialized
    expect(journal).toBeDefined();
  });
  
  test('should throw error when module dependency is missing', async () => {
    // Create a module with a dependency that doesn't exist
    const module: Module = {
      id: 'test-module',
      version: '1.0.0',
      dependencies: [
        { id: 'missing-module', minVersion: '1.0.0' }
      ],
      initialize: async () => {}
    };
    
    // Initializing the journal should throw an error
    await expect(
      initializeJournal(rootConstruct, [module])
    ).rejects.toThrow('Module test-module depends on missing-module, but it was not provided');
  });
  
  test('should throw error when module dependency version is too low', async () => {
    // Create modules with incompatible versions
    const moduleA: Module = {
      id: 'module-a',
      version: '1.0.0',
      dependencies: [
        { id: 'module-b', minVersion: '2.0.0' }
      ],
      initialize: async () => {}
    };
    
    const moduleB: Module = {
      id: 'module-b',
      version: '1.2.0',
      dependencies: [],
      initialize: async () => {}
    };
    
    // Initializing the journal should throw an error
    await expect(
      initializeJournal(rootConstruct, [moduleA, moduleB])
    ).rejects.toThrow('Module module-a depends on module-b >= 2.0.0, but 1.2.0 was provided');
  });
  
  test('should validate all constructs are bound after initialization', async () => {
    // Create a child construct that won't be bound
    const child = new Construct(rootConstruct, 'child');
    
    // Create a module that only binds the root construct
    const module: Module = {
      id: 'test-module',
      version: '1.0.0',
      dependencies: [],
      initialize: async (construct, journal) => {
        // Only bind the root construct, not the child
        journal.markConstructAsBound(construct.node.id);
      }
    };
    
    // Initializing the journal should throw an error
    await expect(
      initializeJournal(rootConstruct, [module])
    ).rejects.toThrow('constructs are not bound');
  });
});