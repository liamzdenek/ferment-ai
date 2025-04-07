import { v4 as uuidv4 } from 'uuid';
import { RootConstruct } from 'constructs';
import {
  Journal,
  JournalEvent,
  EventListener,
  EventFilter,
  JournalOptions,
  JournalState,
  Entity,
  EntityId,
  Component,
  ComponentType,
  Process,
  ProcessId,
  ProcessResult,
  EventType,
  System,
  SystemStateContext,
  SystemStateComponent
} from '@ferment-ai/runtime-interfaces';

/**
 * Implementation of the Journal interface
 */
export class JournalImpl implements Journal {
  /**
   * The state of the journal
   */
  private state: JournalState;

  /**
   * Event listeners
   */
  private eventListeners: Map<string, { filter?: EventFilter; listener: EventListener }> = new Map();

  /**
   * Whether compression is enabled
   */
  private readonly enableCompression: boolean;

  /**
   * The index of the last processed event
   */
  private lastProcessedEventIndex: number = 0;

  /**
   * Creates a new Journal
   * 
   * @param options The journal options
   */
  constructor(options: JournalOptions = {}) {
    this.state = options.initialState || {
      events: [],
      entities: new Map(),
      components: new Map(),
      systems: [],
      processes: new Map(),
      boundConstructs: new Set()
    };
    this.enableCompression = options.enableCompression ?? false;
  }

  /**
   * Publishes an event to the journal
   * 
   * @param type The event type
   * @param source The event source
   * @param payload The event payload
   * @param target The event target
   * @returns The published event
   */
  public publish(
    type: EventType | string,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): JournalEvent {
    console.log(`DEBUG - publish called with type: ${type}, source: ${source}, target: ${target}`);
    console.log(`DEBUG - payload: ${JSON.stringify(payload)}`);
    
    const event: JournalEvent = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload,
    };

    console.log(`DEBUG - created event: ${JSON.stringify(event)}`);
    console.log(`DEBUG - current events count before push: ${this.state.events.length}`);
    
    this.state.events.push(event);
    console.log(`DEBUG - current events count after push: ${this.state.events.length}`);
    
    console.log(`DEBUG - calling notifyListeners for event: ${event.id}`);
    this.notifyListeners(event);
    console.log(`DEBUG - notifyListeners completed for event: ${event.id}`);

    return event;
  }

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribe(listener: EventListener, filter?: EventFilter): string {
    const id = uuidv4();
    this.eventListeners.set(id, { listener, filter });
    return id;
  }

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  public unsubscribe(id: string): void {
    this.eventListeners.delete(id);
  }

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  public getEvents(): JournalEvent[] {
    return [...this.state.events];
  }

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  public getFilteredEvents(filter?: EventFilter): JournalEvent[] {
    if (!filter) {
      return this.getEvents();
    }

    return this.state.events.filter(event => this.eventMatchesFilter(event, filter));
  }

  /**
   * Creates an entity
   * 
   * @returns The ID of the created entity
   */
  public createEntity(): EntityId {
    const id = uuidv4();
    const entity: Entity = { id };
    this.state.entities.set(id, entity);

    this.publish(EventType.ENTITY, 'journal', {
      action: 'entity_created',
      entityId: id,
    });

    return id;
  }

  /**
   * Removes an entity
   * 
   * @param id The ID of the entity to remove
   */
  public removeEntity(id: EntityId): void {
    // Remove the entity
    this.state.entities.delete(id);

    // Remove all components for this entity
    for (const componentMap of this.state.components.values()) {
      componentMap.delete(id);
    }

    this.publish(EventType.ENTITY, 'journal', {
      action: 'entity_removed',
      entityId: id,
    });
  }

  /**
   * Gets an entity
   * 
   * @param id The ID of the entity to get
   * @returns The entity, or undefined if not found
   */
  public getEntity(id: EntityId): Entity | undefined {
    return this.state.entities.get(id);
  }

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  public addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void {
    // Ensure the entity exists
    if (!this.state.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Ensure the component map exists
    if (!this.state.components.has(componentType)) {
      this.state.components.set(componentType, new Map());
    }

    // Add the component
    const componentMap = this.state.components.get(componentType)!;
    componentMap.set(entityId, component);

    this.publish(EventType.COMPONENT, 'journal', {
      action: 'component_added',
      entityId,
      componentType,
      component,
    });
  }

  /**
   * Removes a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   */
  public removeComponent(entityId: EntityId, componentType: ComponentType): void {
    // Ensure the component map exists
    if (!this.state.components.has(componentType)) {
      return;
    }

    // Remove the component
    const componentMap = this.state.components.get(componentType)!;
    componentMap.delete(entityId);

    this.publish(EventType.COMPONENT, 'journal', {
      action: 'component_removed',
      entityId,
      componentType,
    });
  }

  /**
   * Gets a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @returns The component, or undefined if not found
   */
  public getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    // Ensure the component map exists
    if (!this.state.components.has(componentType)) {
      return undefined;
    }

    // Get the component
    const componentMap = this.state.components.get(componentType)!;
    return componentMap.get(entityId) as T | undefined;
  }

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  public getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    // Ensure the component map exists
    if (!this.state.components.has(componentType)) {
      return [];
    }

    // Get the entities with this component
    const componentMap = this.state.components.get(componentType)!;
    return Array.from(componentMap.keys());
  }

  /**
   * Registers a system
   *
   * @param system The system to register
   */
  public registerSystem<T extends Record<string, any> = Record<string, any>, S = any>(system: System<T, S>): void {
    this.state.systems.push(system);

    // Create an entity for the system's state
    const entityId = this.createEntity();
    
    // Add a SystemStateComponent with the initial state
    this.addComponent(entityId, 'SystemStateComponent', {
      type: 'SystemStateComponent',
      systemId: system.id,
      state: system.initialState
    });

    this.publish(EventType.SYSTEM, 'journal', {
      action: 'system_registered',
      systemId: system.id,
      eventTypes: system.eventTypes,
    });
  }

  /**
   * Unregisters a system
   * 
   * @param systemId The ID of the system to unregister
   */
  public unregisterSystem(systemId: string): void {
    this.state.systems = this.state.systems.filter(system => system.id !== systemId);

    this.publish(EventType.SYSTEM, 'journal', {
      action: 'system_unregistered',
      systemId,
    });
  }

  /**
   * Creates a process
   * 
   * @param process The process to create
   * @returns The ID of the created process
   */
  public createProcess(process: Process): ProcessId {
    this.state.processes.set(process.id, process);

    this.publish(EventType.PROCESS, 'journal', {
      action: 'process_created',
      processId: process.id,
      processType: process.type,
    });

    return process.id;
  }

  /**
   * Completes a process
   * 
   * @param processId The ID of the process to complete
   * @param result The result of the process
   */
  public completeProcess(processId: ProcessId, result: ProcessResult): void {
    const process = this.state.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} does not exist`);
    }

    process.status = 'completed';
    process.endTime = Date.now();
    process.result = result;

    this.publish(EventType.PROCESS, 'journal', {
      action: 'process_completed',
      processId,
      result,
    });
  }

  /**
   * Fails a process
   * 
   * @param processId The ID of the process to fail
   * @param error The error that caused the process to fail
   */
  public failProcess(processId: ProcessId, error: Error): void {
    const process = this.state.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} does not exist`);
    }

    process.status = 'failed';
    process.endTime = Date.now();
    process.result = {
      success: false,
      error,
    };

    this.publish(EventType.PROCESS, 'journal', {
      action: 'process_failed',
      processId,
      error: error.message,
    });
  }

  /**
   * Gets a process
   * 
   * @param processId The ID of the process to get
   * @returns The process, or undefined if not found
   */
  public getProcess(processId: ProcessId): Process | undefined {
    return this.state.processes.get(processId);
  }
  
  /**
   * Gets all processes in the journal
   *
   * @returns A map of process IDs to processes
   */
  public getProcesses(): Map<ProcessId, Process> {
    return this.state.processes;
  }

  /**
   * Marks a construct as bound
   * 
   * @param constructId The ID of the construct to mark as bound
   */
  public markConstructAsBound(constructId: string): void {
    this.state.boundConstructs.add(constructId);

    this.publish(EventType.SYSTEM, 'journal', {
      action: 'construct_bound',
      constructId,
    });
  }

  /**
   * Validates that all constructs are bound
   * 
   * @param rootConstruct The root construct
   */
  public validateAllConstructsBound(rootConstruct: RootConstruct): void {
    console.log('Validating all constructs are bound...');
    console.log('Bound constructs:', Array.from(this.state.boundConstructs));
    
    const unboundConstructs = this.findUnboundConstructs(rootConstruct);
    console.log('Unbound constructs:', unboundConstructs);
    
    // Filter out undefined constructs
    const validUnboundConstructs = unboundConstructs.filter(id => id !== undefined && id !== 'undefined');
    
    if (validUnboundConstructs.length > 0) {
      throw new Error(`The following ${validUnboundConstructs.length} constructs are not bound: ${validUnboundConstructs}`);
    }
  }

  /**
   * Executes the journal, processing events until there are no more active processes
   * 
   * @returns An async iterable of journal events
   */
  public async *execute(): AsyncIterable<JournalEvent> {
    console.log(`Executing journal - DEBUG MODE`);
    console.log(`Initial events count: ${this.state.events.length}`);
    console.log(`Initial events: ${JSON.stringify(this.state.events)}`);
    
    // Add a direct subscription to all events for debugging
    const debugSubscriptionId = this.subscribe((event) => {
      console.log(`DEBUG - Event received in subscription: ${JSON.stringify(event)}`);
    });
    
    // Reset the last processed event index
    this.lastProcessedEventIndex = this.state.events.length;
    console.log(`Last processed event index: ${this.lastProcessedEventIndex}`);
    
    // Process events until there are no more active processes
    let activeProcesses = true;
    
    // Keep track of the last event we've seen
    let lastEventCount = this.state.events.length;
    let checkCount = 0;
    
    while (activeProcesses || lastEventCount < this.state.events.length) {
      console.log(`Loop iteration - Active processes: ${activeProcesses}, Events count: ${this.state.events.length}, Last event count: ${lastEventCount}`);
      
      // Check if there are any active processes
      activeProcesses = Array.from(this.state.processes.values())
        .some(process => process.status === 'running');
      
      // Check if we have new events since the last check
      const hasNewEvents = lastEventCount < this.state.events.length;
      
      // If no active processes and no new events for several checks, we're done
      if (!activeProcesses && !hasNewEvents) {
        // Do a few more checks to ensure we've captured all events
        checkCount++;
        if (checkCount > 3) {
          break;
        }
      } else {
        checkCount = 0; // Reset the check count if we have activity
      }

      // Wait for the next event (using a promise to simulate async behavior)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if any new events have been published
      const newEvents = this.state.events.slice(this.lastProcessedEventIndex);
      console.log(`New events count: ${newEvents.length}`);
      if (newEvents.length > 0) {
        console.log(`New events: ${JSON.stringify(newEvents)}`);
      }
      
      this.lastProcessedEventIndex = this.state.events.length;
      lastEventCount = this.state.events.length;

      // Process each new event
      for (const event of newEvents) {
        console.log(`Processing event: ${JSON.stringify(event)}`);
        
        // Find systems that handle this event type
        const matchingSystems = this.state.systems
          .filter(system => system.eventTypes.includes(event.type));
        
        console.log(`Matching systems count: ${matchingSystems.length}`);
        if (matchingSystems.length > 0) {
          console.log(`Matching systems: ${matchingSystems.map(s => s.id).join(', ')}`);
        }

        // Execute each matching system
        for (const system of matchingSystems) {
          console.log(`Executing system: ${system.id}`);
          
          // Create state context for the system
          const stateContext = this.createStateContext(system.id);
          
          // Execute the system with the state context
          await system.execute(this, event, stateContext);
          
          console.log(`System ${system.id} execution completed`);
        }

        // Yield the event
        console.log(`Yielding event: ${JSON.stringify(event)}`);
        yield event;
      }
      
      // Unsubscribe from debug events
      this.unsubscribe(debugSubscriptionId);
      
      console.log(`Execute method completed - Final events count: ${this.state.events.length}`);
    }
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  public serialize(): string {
    // Convert Maps and Sets to plain objects and arrays
    const serialized = {
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      events: this.state.events,
      entities: Object.fromEntries(this.state.entities.entries()),
      components: Object.fromEntries(
        Array.from(this.state.components.entries()).map((entry) => {
          const [type, map] = entry;
          return [
            type,
            Object.fromEntries(map.entries()),
          ];
        })
      ),
      processes: Object.fromEntries(this.state.processes.entries()),
      boundConstructs: Array.from(this.state.boundConstructs),
    };
    
    return JSON.stringify(serialized);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  public deserialize(data: string): void {
    const parsed = JSON.parse(data);
    
    // Convert plain objects and arrays back to Maps and Sets
    this.state.events = parsed.events || [];
    this.state.entities = new Map();
    this.state.components = new Map();
    this.state.systems = []; // Systems are not serialized, they will be reloaded
    this.state.processes = new Map();
    this.state.boundConstructs = new Set(parsed.boundConstructs || []);
    
    // Convert entities
    if (parsed.entities) {
      for (const [id, entity] of Object.entries(parsed.entities)) {
        this.state.entities.set(id, entity as Entity);
      }
    }
    
    // Convert components
    if (parsed.components) {
      for (const [type, entities] of Object.entries(parsed.components)) {
        const entityMap = new Map<EntityId, Component>();
        for (const [entityId, component] of Object.entries(entities as Record<string, any>)) {
          entityMap.set(entityId, component as Component);
        }
        this.state.components.set(type, entityMap);
      }
    }
    
    // Convert processes
    if (parsed.processes) {
      for (const [id, process] of Object.entries(parsed.processes)) {
        this.state.processes.set(id, process as Process);
      }
    }
  }

  /**
   * Clears all events from the journal
   */
  public clear(): void {
    this.state.events = [];
    this.state.entities = new Map();
    this.state.components = new Map();
    this.state.systems = [];
    this.state.processes = new Map();
    this.state.boundConstructs = new Set();
  }

  /**
   * Notifies all listeners of an event
   * 
   * @param event The event to notify listeners of
   */
  private notifyListeners(event: JournalEvent): void {
    console.log(`DEBUG - notifyListeners called for event: ${JSON.stringify(event)}`);
    console.log(`DEBUG - Current listeners count: ${this.eventListeners.size}`);
    
    let hasListeners = false;
    for (const [id, { listener, filter }] of this.eventListeners.entries()) {
      console.log(`DEBUG - Checking listener ${id} with filter: ${JSON.stringify(filter)}`);
      
      if (!filter || this.eventMatchesFilter(event, filter)) {
        console.log(`DEBUG - Listener ${id} matches event`);
        hasListeners = true;
        listener(event);
      } else {
        console.log(`DEBUG - Listener ${id} does not match event`);
      }
    }

    if(!hasListeners) {
      console.warn(`No listeners for event:`, event);
      
      // Add a warning to the journal, but only if it's not a warning event itself
      // to prevent infinite recursion
      if (event.type !== 'warning') {
        console.log(`DEBUG - Publishing warning event for unhandled event: ${event.type}`);
        
        const warningEvent = this.publish('warning', 'journal', {
          message: `No listeners for event of type: ${event.type}`,
          eventId: event.id,
          eventType: event.type,
          eventSource: event.source,
        });
        
        console.log(`DEBUG - Warning event published: ${JSON.stringify(warningEvent)}`);
      } else {
        console.log(`DEBUG - Not publishing warning for warning event to prevent recursion`);
      }
    }
  }

  /**
   * Checks if an event matches a filter
   * 
   * @param event The event to check
   * @param filter The filter to check against
   * @returns Whether the event matches the filter
   */
  private eventMatchesFilter(event: JournalEvent, filter?: EventFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.type && event.type !== filter.type) {
      return false;
    }

    if (filter.source && event.source !== filter.source) {
      return false;
    }

    if (filter.target && event.target !== filter.target) {
      return false;
    }

    return true;
  }

  /**
   * Finds all constructs that are not bound
   * 
   * @param construct The construct to check
   * @returns The IDs of constructs that are not bound
   */
  private findUnboundConstructs(construct: RootConstruct): string[] {
    const unboundConstructs: string[] = [];
    
    const traverse = (node: any): void => {
      if (!node) {
        return;
      }
      
      // Check if this node is bound
      const nodeId = node.node?.id;
      if (nodeId && !this.state.boundConstructs.has(nodeId)) {
        // Skip the root construct
        if (node !== construct) {
          unboundConstructs.push(nodeId);
        }
      }
      
      // Traverse children
      const children = node.node?.children || [];
      for (const child of children) {
        traverse(child);
      }
    };
    
    traverse(construct);
    
    return unboundConstructs;
  }

  /**
   * Creates a state context for a system
   * 
   * @param systemId The ID of the system
   * @returns The state context
   */
  private createStateContext<S = any>(systemId: string): SystemStateContext<S> {
    return {
      getState: () => {
        // Find the system state component
        const entities = this.getEntitiesWithComponent('SystemStateComponent');
        for (const entityId of entities) {
          const component = this.getComponent<SystemStateComponent>(entityId, 'SystemStateComponent');
          if (component && component.systemId === systemId) {
            return component.state as S;
          }
        }
        
        // If no state found, find the system and return its initial state
        const system = this.state.systems.find(s => s.id === systemId);
        return system?.initialState as S;
      },
      setState: (newState: S) => {
        // Find and update the system state component
        const entities = this.getEntitiesWithComponent('SystemStateComponent');
        for (const entityId of entities) {
          const component = this.getComponent<SystemStateComponent>(entityId, 'SystemStateComponent');
          if (component && component.systemId === systemId) {
            this.addComponent(entityId, 'SystemStateComponent', {
              ...component,
              state: newState
            });
            return;
          }
        }
        
        // If no state component found, create one
        const entityId = this.createEntity();
        this.addComponent(entityId, 'SystemStateComponent', {
          type: 'SystemStateComponent',
          systemId,
          state: newState
        });
      }
    };
  }
}