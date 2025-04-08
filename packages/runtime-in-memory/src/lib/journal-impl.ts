import { v4 as uuidv4 } from 'uuid';
import { RootConstruct } from 'constructs';
import { Observable, Subject, ReplaySubject, BehaviorSubject, Subscription, merge, from } from 'rxjs';
import { filter as rxFilter, tap, scan } from 'rxjs/operators';
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
  SystemStateComponent,
  Fiber,
  SystemState,
  EnhancedEvent,
  SystemEventQueue
} from '@ferment-ai/runtime-interfaces';
import { 
  createFiber, 
  withFiberContext, 
  resetFiberForExecution, 
  runFiberCleanup 
} from '@ferment-ai/runtime-hooks';

/**
 * Implementation of the Journal interface using RxJS
 */
export class JournalImpl implements Journal {
  /**
   * The state of the journal
   */
  private state$: BehaviorSubject<JournalState>;

  /**
   * Stream of all events (historical + live)
   */
  private allEvents$: ReplaySubject<JournalEvent>;

  /**
   * Stream of only new live events
   */
  private liveEvents$: Subject<JournalEvent>;

  /**
   * Map of subscription IDs to subscriptions
   */
  private subscriptions: Map<string, Subscription>;

  /**
   * Map of system IDs to system state
   */
  private systems: Map<string, System>;
  
  /**
   * Map of system IDs to hook-based system state
   */
  private hookSystems: Map<string, SystemState>;
  
  /**
   * Map of system IDs to event queues
   */
  private systemEventQueues: Map<string, SystemEventQueue>;

  /**
   * Creates a new JournalImpl
   * 
   * @param options Options for the journal
   */
  constructor(options: JournalOptions = {}) {
    // Initialize state
    this.state$ = new BehaviorSubject<JournalState>(options.initialState || {
      events: [],
      entities: new Map(),
      components: new Map(),
      systems: [],
      processes: new Map(),
      boundConstructs: new Set()
    });

    // Initialize event streams
    this.allEvents$ = new ReplaySubject<JournalEvent>();
    this.liveEvents$ = new Subject<JournalEvent>();

    // Initialize subscriptions
    this.subscriptions = new Map();

    // Initialize systems
    this.systems = new Map();
    
    // Initialize hook-based systems
    this.hookSystems = new Map();
    
    // Initialize system event queues
    this.systemEventQueues = new Map();

    // Pipe live events to all events
    this.liveEvents$.subscribe(this.allEvents$);
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
  publish(
    type: EventType | string,
    source: string,
    payload: Record<string, any>,
    target?: string
  ): JournalEvent {
    // Create the event
    const event: JournalEvent = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload
    };

    // Update state
    this.state$.next({
      ...this.state$.value,
      events: [...this.state$.value.events, event]
    });

    // Emit the event
    this.liveEvents$.next(event);

    return event;
  }

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(listener: EventListener, filter?: EventFilter): string {
    // Create a subscription ID
    const id = uuidv4();

    // Create a filtered observable
    const filtered$ = this.allEvents$.pipe(
      rxFilter(event => {
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
      })
    );

    // Subscribe to the filtered observable
    const subscription = filtered$.subscribe(listener);

    // Store the subscription
    this.subscriptions.set(id, subscription);

    return id;
  }

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  unsubscribe(id: string): void {
    // Get the subscription
    const subscription = this.subscriptions.get(id);

    if (subscription) {
      // Unsubscribe
      subscription.unsubscribe();

      // Remove the subscription
      this.subscriptions.delete(id);
    }
  }

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  getEvents(): JournalEvent[] {
    return this.state$.value.events;
  }

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  getFilteredEvents(filter?: EventFilter): JournalEvent[] {
    if (!filter) {
      return this.getEvents();
    }

    return this.getEvents().filter(event => {
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
    });
  }

  /**
   * Creates an entity
   * 
   * @returns The ID of the created entity
   */
  createEntity(): EntityId {
    // Create an entity ID
    const id = uuidv4();

    // Create the entity
    const entity: Entity = {
      id
    };

    // Update state
    this.state$.next({
      ...this.state$.value,
      entities: new Map(this.state$.value.entities).set(id, entity)
    });

    return id;
  }

  /**
   * Removes an entity
   * 
   * @param id The ID of the entity to remove
   */
  removeEntity(id: EntityId): void {
    // Get the entity
    const entity = this.state$.value.entities.get(id);

    if (!entity) {
      return;
    }

    // Update state
    const entities = new Map(this.state$.value.entities);
    entities.delete(id);

    this.state$.next({
      ...this.state$.value,
      entities
    });
  }

  /**
   * Gets an entity
   * 
   * @param id The ID of the entity to get
   * @returns The entity, or undefined if not found
   */
  getEntity(id: EntityId): Entity | undefined {
    return this.state$.value.entities.get(id);
  }

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void {
    // Get the entity
    const entity = this.state$.value.entities.get(entityId);

    if (!entity) {
      return;
    }

    // Get the component map for this type
    const componentMap = this.state$.value.components.get(componentType) || new Map();

    // Update state
    const components = new Map(this.state$.value.components);
    components.set(componentType, new Map(componentMap).set(entityId, component));

    this.state$.next({
      ...this.state$.value,
      components
    });
  }

  /**
   * Removes a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    // Get the component map for this type
    const componentMap = this.state$.value.components.get(componentType);

    if (!componentMap) {
      return;
    }

    // Update state
    const components = new Map(this.state$.value.components);
    const newComponentMap = new Map(componentMap);
    newComponentMap.delete(entityId);
    components.set(componentType, newComponentMap);

    this.state$.next({
      ...this.state$.value,
      components
    });
  }

  /**
   * Gets a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @returns The component, or undefined if not found
   */
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    // Get the component map for this type
    const componentMap = this.state$.value.components.get(componentType);

    if (!componentMap) {
      return undefined;
    }

    return componentMap.get(entityId) as T;
  }

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    // Get the component map for this type
    const componentMap = this.state$.value.components.get(componentType);

    if (!componentMap) {
      return [];
    }

    return Array.from(componentMap.keys());
  }

  /**
   * Registers a system
   * 
   * @param system The system to register
   */
  registerSystem(system: System): void {
    // Update state
    this.state$.next({
      ...this.state$.value,
      systems: [...this.state$.value.systems, system]
    });

    // Store the system
    this.systems.set(system.id, system);
  }

  /**
   * Unregisters a system
   * 
   * @param systemId The ID of the system to unregister
   */
  unregisterSystem(systemId: string): void {
    // Get the system
    const system = this.systems.get(systemId);

    if (!system) {
      return;
    }

    // Update state
    this.state$.next({
      ...this.state$.value,
      systems: this.state$.value.systems.filter(s => s.id !== systemId)
    });

    // Remove the system
    this.systems.delete(systemId);
  }

  /**
   * Creates a process
   * 
   * @param process The process to create
   * @returns The ID of the created process
   */
  createProcess(process: Process): ProcessId {
    // Get the process ID
    const id = process.id || uuidv4();

    // Create the process
    const fullProcess: Process = {
      ...process,
      id
    };

    // Update state
    this.state$.next({
      ...this.state$.value,
      processes: new Map(this.state$.value.processes).set(id, fullProcess)
    });

    return id;
  }

  /**
   * Completes a process
   * 
   * @param processId The ID of the process to complete
   * @param result The result of the process
   */
  completeProcess(processId: ProcessId, result: ProcessResult): void {
    // Get the process
    const process = this.state$.value.processes.get(processId);

    if (!process) {
      return;
    }

    // Update the process
    const updatedProcess: Process = {
      ...process,
      status: 'completed',
      endTime: Date.now(),
      result
    };

    // Update state
    this.state$.next({
      ...this.state$.value,
      processes: new Map(this.state$.value.processes).set(processId, updatedProcess)
    });
    
    // If the process was attached to a system, process queued events
    if (process.attachedSystemId) {
      this.processQueuedEvents(process.attachedSystemId);
    }
  }

  /**
   * Fails a process
   * 
   * @param processId The ID of the process to fail
   * @param error The error that caused the process to fail
   */
  failProcess(processId: ProcessId, error: Error): void {
    // Get the process
    const process = this.state$.value.processes.get(processId);

    if (!process) {
      return;
    }

    // Update the process
    const updatedProcess: Process = {
      ...process,
      status: 'failed',
      endTime: Date.now(),
      result: {
        success: false,
        error: new Error(error.message)
      }
    };

    // Update state
    this.state$.next({
      ...this.state$.value,
      processes: new Map(this.state$.value.processes).set(processId, updatedProcess)
    });
    
    // If the process was attached to a system, process queued events
    if (process.attachedSystemId) {
      this.processQueuedEvents(process.attachedSystemId);
    }
  }

  /**
   * Gets a process
   * 
   * @param processId The ID of the process to get
   * @returns The process, or undefined if not found
   */
  getProcess(processId: ProcessId): Process | undefined {
    return this.state$.value.processes.get(processId);
  }
  
  /**
   * Gets all processes in the journal
   *
   * @returns A map of process IDs to processes
   */
  getProcesses(): Map<ProcessId, Process> {
    return this.state$.value.processes;
  }

  /**
   * Marks a construct as bound
   * 
   * @param constructId The ID of the construct to mark as bound
   */
  markConstructAsBound(constructId: string): void {
    // Update state
    this.state$.next({
      ...this.state$.value,
      boundConstructs: new Set(this.state$.value.boundConstructs).add(constructId)
    });
  }

  /**
   * Validates that all constructs are bound
   * 
   * @param rootConstruct The root construct
   */
  validateAllConstructsBound(rootConstruct: any): void {
    // Get all constructs
    const constructs = this.getAllConstructs(rootConstruct);

    // Check if all constructs are bound
    for (const construct of constructs) {
      if (!this.state$.value.boundConstructs.has(construct.node.id)) {
        throw new Error(`Construct ${construct.node.id} is not bound`);
      }
    }
  }

  /**
   * Executes the journal, processing events until there are no more active processes
   *
   * @returns An Observable stream of all journal events (historical and live)
   */
  execute(): Observable<JournalEvent> {
    return this.allEvents$;
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  serialize(): string {
    // Get the state
    const state = this.state$.value;

    // Convert maps to arrays
    const serializedState = {
      events: state.events,
      entities: Array.from(state.entities.entries()),
      components: Array.from(state.components.entries()).map(([type, map]) => [type, Array.from(map.entries())]),
      systems: state.systems,
      processes: Array.from(state.processes.entries()),
      boundConstructs: Array.from(state.boundConstructs)
    };

    return JSON.stringify(serializedState);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  deserialize(data: string): void {
    // Parse the data
    const serializedState = JSON.parse(data);

    // Convert arrays to maps
    const state: JournalState = {
      events: serializedState.events,
      entities: new Map(serializedState.entities),
      components: new Map(serializedState.components.map(([type, entries]: [string, any[]]) => [type, new Map(entries)])),
      systems: serializedState.systems,
      processes: new Map(serializedState.processes),
      boundConstructs: new Set(serializedState.boundConstructs)
    };

    // Update state
    this.state$.next(state);

    // Emit all events
    for (const event of state.events) {
      this.allEvents$.next(event);
    }
  }

  /**
   * Clears all events from the journal
   */
  clear(): void {
    // Update state
    this.state$.next({
      events: [],
      entities: new Map(),
      components: new Map(),
      systems: [],
      processes: new Map(),
      boundConstructs: new Set()
    });
  }
  
  /**
   * Attaches a process to a system
   * 
   * When a process is attached to a system, events for that system will be
   * queued until the process completes.
   * 
   * @param processId The ID of the process to attach
   * @param systemId The ID of the system to attach the process to
   */
  attachProcessToSystem(processId: string, systemId: string): void {
    // Get the process
    const process = this.state$.value.processes.get(processId);
    
    if (!process) {
      return;
    }
    
    // Update the process
    const updatedProcess: Process = {
      ...process,
      attachedSystemId: systemId
    };
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      processes: new Map(this.state$.value.processes).set(processId, updatedProcess)
    });
    
    // Get or create the system event queue
    let queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      queue = {
        systemId,
        activeProcesses: new Set(),
        queuedEvents: []
      };
      this.systemEventQueues.set(systemId, queue);
    }
    
    // Add the process to the queue
    queue.activeProcesses.add(processId);
  }
  
  /**
   * Detaches a process from a system
   * 
   * @param processId The ID of the process to detach
   * @param systemId The ID of the system to detach the process from
   */
  detachProcessFromSystem(processId: string, systemId: string): void {
    // Get the process
    const process = this.state$.value.processes.get(processId);
    
    if (!process) {
      return;
    }
    
    // Update the process
    const updatedProcess: Process = {
      ...process,
      attachedSystemId: undefined
    };
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      processes: new Map(this.state$.value.processes).set(processId, updatedProcess)
    });
    
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return;
    }
    
    // Remove the process from the queue
    queue.activeProcesses.delete(processId);
    
    // If there are no more active processes, process queued events
    if (queue.activeProcesses.size === 0) {
      this.processQueuedEvents(systemId);
    }
  }
  
  /**
   * Checks if a system is blocked by active processes
   * 
   * @param systemId The ID of the system to check
   * @returns Whether the system is blocked
   */
  isSystemBlocked(systemId: string): boolean {
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return false;
    }
    
    return queue.activeProcesses.size > 0;
  }
  
  /**
   * Queues an event for a system
   *
   * If the system is blocked by active processes, the event will be queued
   * until all processes complete.
   *
   * @param event The event to queue
   * @param systemId The ID of the system to queue the event for
   */
  queueEventForSystem(event: JournalEvent, systemId: string): void {
    // Get or create the system event queue
    let queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      queue = {
        systemId,
        activeProcesses: new Set(),
        queuedEvents: []
      };
      this.systemEventQueues.set(systemId, queue);
    }
    
    // If the system is blocked, queue the event
    if (queue.activeProcesses.size > 0) {
      // Convert JournalEvent to EnhancedEvent
      const enhancedEvent: EnhancedEvent<any> = {
        id: event.id,
        type: event.type,
        sourceConstructName: event.source,
        sourceConstructType: 'unknown',
        sourceSystemName: event.source,
        timestamp: event.timestamp,
        payload: event.payload
      };
      
      queue.queuedEvents.push(enhancedEvent);
    } else {
      // Otherwise, publish the event
      this.publish(event.type, event.source, event.payload, event.target);
    }
  }
  
  /**
   * Processes queued events for a system
   *
   * This is called automatically when all processes attached to a system complete.
   *
   * @param systemId The ID of the system to process queued events for
   */
  processQueuedEvents(systemId: string): void {
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return;
    }
    
    // If there are no more active processes, process queued events
    if (queue.activeProcesses.size === 0) {
      // Process all queued events
      for (const event of queue.queuedEvents) {
        this.publish(event.type, event.sourceConstructName, event.payload);
      }
      
      // Clear the queue
      queue.queuedEvents = [];
    }
  }
  
  /**
   * Mounts a hook-based system
   * 
   * @param system The system to mount
   */
  mountSystem(system: System): void {
    // Create a fiber for the system
    const fiber = createFiber(system.id);
    
    // Create system state
    const systemState: SystemState = {
      fiber,
      eventSubscriptions: new Map()
    };
    
    // Store the system state
    this.hookSystems.set(system.id, systemState);
    
    // Mount the system
    withFiberContext(fiber, () => {
      system.mount(this);
    });
  }
  
  /**
   * Unmounts a system
   * 
   * @param systemId The ID of the system to unmount
   */
  unmountSystem(systemId: string): void {
    // Get the system state
    const systemState = this.hookSystems.get(systemId);
    
    if (!systemState) {
      return;
    }
    
    // Unsubscribe from all events
    for (const subscriptionId of systemState.eventSubscriptions.values()) {
      this.unsubscribe(subscriptionId);
    }
    
    // Run cleanup functions
    runFiberCleanup(systemState.fiber);
    
    // Remove the system state
    this.hookSystems.delete(systemId);
  }

  /**
   * Gets all constructs in a construct tree
   * 
   * @param construct The root construct
   * @returns All constructs in the tree
   */
  private getAllConstructs(construct: any): any[] {
    const constructs = [construct];

    for (const child of construct.node.children) {
      constructs.push(...this.getAllConstructs(child));
    }

    return constructs;
  }
}