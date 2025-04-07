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
  SystemStateComponent
} from '@ferment-ai/runtime-interfaces';

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
   * Event listeners (legacy API)
   */
  private eventListeners: Map<string, { filter?: EventFilter; listener: EventListener }> = new Map();

  /**
   * RxJS subscriptions
   */
  private subscriptions: Map<string, Subscription> = new Map();

  /**
   * Internal subscriptions for the journal's own use
   */
  private internalSubscriptions: Subscription = new Subscription();

  /**
   * Whether compression is enabled
   */
  private readonly enableCompression: boolean;

  /**
   * Creates a new Journal
   * 
   * @param options The journal options
   */
  constructor(options: JournalOptions = {}) {
    // Initialize the state
    const initialState = options.initialState || {
      events: [],
      entities: new Map(),
      components: new Map(),
      systems: [],
      processes: new Map(),
      boundConstructs: new Set()
    };

    // Initialize RxJS streams
    this.state$ = new BehaviorSubject<JournalState>(initialState);
    this.allEvents$ = new ReplaySubject<JournalEvent>();
    this.liveEvents$ = new Subject<JournalEvent>();
    
    // Set up internal subscriptions
    this.connectLiveEventProcessing();
    
    // Prime the allEvents$ with historical events
    if (initialState.events.length > 0) {
      console.log(`Priming allEvents$ with ${initialState.events.length} historical events`);
      for (const event of initialState.events) {
        this.allEvents$.next(event);
      }
    }
    
    this.enableCompression = options.enableCompression ?? false;
  }
  
  /**
   * Connects the live event processing pipeline
   */
  private connectLiveEventProcessing(): void {
    // Clean up any existing subscriptions
    this.internalSubscriptions.unsubscribe();
    this.internalSubscriptions = new Subscription();
    
    // 1. Feed live events to the replay subject
    this.internalSubscriptions.add(
      this.liveEvents$.subscribe((event: JournalEvent) => {
        this.allEvents$.next(event);
      })
    );
    
    // 2. Update state based on live events
    this.internalSubscriptions.add(
      this.liveEvents$.pipe(
        scan((state: JournalState, event: JournalEvent) => {
          // Add the event to the state's events array
          return {
            ...state,
            events: [...state.events, event]
          };
        }, this.state$.getValue())
      ).subscribe((newState: JournalState) => {
        this.state$.next(newState);
      })
    );
    
    // 3. Notify legacy event listeners
    this.internalSubscriptions.add(
      this.liveEvents$.subscribe((event: JournalEvent) => {
        this.notifyListeners(event);
      })
    );
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
    
    const event: JournalEvent = {
      id: uuidv4(),
      type,
      source,
      target,
      timestamp: Date.now(),
      payload,
    };

    console.log(`DEBUG - created event: ${JSON.stringify(event)}`);
    
    // Publish to the live events stream
    // This will trigger:
    // 1. Adding to allEvents$ via the internal subscription
    // 2. Updating state$ via the internal subscription
    // 3. Notifying legacy listeners via the internal subscription
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
  public subscribe(listener: EventListener, filter?: EventFilter): string {
    const id = uuidv4();
    
    // Store in legacy event listeners map for backward compatibility
    this.eventListeners.set(id, { listener, filter });
    
    // Create an RxJS subscription
    const subscription = this.allEvents$.pipe(
      rxFilter((event: JournalEvent) => !filter || this.eventMatchesFilter(event, filter))
    ).subscribe(event => listener(event));
    
    // Store the subscription
    this.subscriptions.set(id, subscription);
    
    return id;
  }

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  public unsubscribe(id: string): void {
    // Remove from legacy event listeners
    this.eventListeners.delete(id);
    
    // Unsubscribe from RxJS subscription
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(id);
    }
  }

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  public getEvents(): JournalEvent[] {
    return [...this.state$.getValue().events];
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

    return this.state$.getValue().events.filter((event: JournalEvent) => this.eventMatchesFilter(event, filter));
  }

  /**
   * Creates an entity
   * 
   * @returns The ID of the created entity
   */
  public createEntity(): EntityId {
    const id = uuidv4();
    const entity: Entity = { id };
    
    // Get current state
    const currentState = this.state$.getValue();
    
    // Update entities map
    currentState.entities.set(id, entity);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    // Remove the entity
    currentState.entities.delete(id);

    // Remove all components for this entity
    for (const componentMap of currentState.components.values()) {
      componentMap.delete(id);
    }
    
    // Update state
    this.state$.next(currentState);

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
    return this.state$.getValue().entities.get(id);
  }

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  public addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void {
    // Get current state
    const currentState = this.state$.getValue();
    
    // Ensure the entity exists
    if (!currentState.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Ensure the component map exists
    if (!currentState.components.has(componentType)) {
      currentState.components.set(componentType, new Map());
    }

    // Add the component
    const componentMap = currentState.components.get(componentType)!;
    componentMap.set(entityId, component);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    // Ensure the component map exists
    if (!currentState.components.has(componentType)) {
      return;
    }

    // Remove the component
    const componentMap = currentState.components.get(componentType)!;
    componentMap.delete(entityId);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    // Ensure the component map exists
    if (!currentState.components.has(componentType)) {
      return undefined;
    }

    // Get the component
    const componentMap = currentState.components.get(componentType)!;
    return componentMap.get(entityId) as T | undefined;
  }

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  public getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    // Get current state
    const currentState = this.state$.getValue();
    
    // Ensure the component map exists
    if (!currentState.components.has(componentType)) {
      return [];
    }

    // Get the entities with this component
    const componentMap = currentState.components.get(componentType)!;
    return Array.from(componentMap.keys());
  }

  /**
   * Registers a system
   *
   * @param system The system to register
   */
  public registerSystem<T extends Record<string, any> = Record<string, any>, S = any>(system: System<T, S>): void {
    // Get current state
    const currentState = this.state$.getValue();
    
    // Add system to systems array
    currentState.systems.push(system);
    
    // Update state
    this.state$.next(currentState);

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
    
    // Set up subscription for this system to listen to its events
    const systemSubscription = this.liveEvents$.pipe(
      rxFilter((event: JournalEvent) => system.eventTypes.includes(event.type))
    ).subscribe(async (event: JournalEvent) => {
      // Create state context for the system
      const stateContext = this.createStateContext(system.id);
      
      // Execute the system with the state context
      await system.execute(this, event, stateContext);
    });
    
    // Add to internal subscriptions
    this.internalSubscriptions.add(systemSubscription);
  }

  /**
   * Unregisters a system
   * 
   * @param systemId The ID of the system to unregister
   */
  public unregisterSystem(systemId: string): void {
    // Get current state
    const currentState = this.state$.getValue();
    
    // Remove system from systems array
    currentState.systems = currentState.systems.filter((system: System) => system.id !== systemId);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    // Add process to processes map
    currentState.processes.set(process.id, process);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    const process = currentState.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} does not exist`);
    }

    process.status = 'completed';
    process.endTime = Date.now();
    process.result = result;
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    const process = currentState.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} does not exist`);
    }

    process.status = 'failed';
    process.endTime = Date.now();
    process.result = {
      success: false,
      error,
    };
    
    // Update state
    this.state$.next(currentState);

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
    return this.state$.getValue().processes.get(processId);
  }
  
  /**
   * Gets all processes in the journal
   *
   * @returns A map of process IDs to processes
   */
  public getProcesses(): Map<ProcessId, Process> {
    return this.state$.getValue().processes;
  }

  /**
   * Marks a construct as bound
   * 
   * @param constructId The ID of the construct to mark as bound
   */
  public markConstructAsBound(constructId: string): void {
    // Get current state
    const currentState = this.state$.getValue();
    
    // Add construct to boundConstructs set
    currentState.boundConstructs.add(constructId);
    
    // Update state
    this.state$.next(currentState);

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
    // Get current state
    const currentState = this.state$.getValue();
    
    console.log('Validating all constructs are bound...');
    console.log('Bound constructs:', Array.from(currentState.boundConstructs));
    
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
   * @returns An Observable of journal events
   */
  public execute(): Observable<JournalEvent> {
    console.log(`Execute method called - returning allEvents$ observable`);
    
    // Return the allEvents$ ReplaySubject as an Observable
    // This will immediately emit all historical events to new subscribers
    // and then emit any new events as they occur
    return this.allEvents$.asObservable();
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  public serialize(): string {
    // Get the current state
    const currentState = this.state$.getValue();
    
    // Convert Maps and Sets to plain objects and arrays
    const serialized = {
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      events: currentState.events,
      entities: Object.fromEntries(currentState.entities.entries()),
      components: Object.fromEntries(
        Array.from(currentState.components.entries()).map((entry) => {
          const [type, map] = entry as [string, Map<EntityId, Component>];
          return [
            type,
            Object.fromEntries(map.entries()),
          ];
        })
      ),
      processes: Object.fromEntries(currentState.processes.entries()),
      boundConstructs: Array.from(currentState.boundConstructs),
    };
    
    return JSON.stringify(serialized);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  public deserialize(data: string): void {
    console.log(`Deserializing journal state`);
    const parsed = JSON.parse(data);
    
    // Convert plain objects and arrays back to Maps and Sets
    const newState: JournalState = {
      events: parsed.events || [],
      entities: new Map(),
      components: new Map(),
      systems: [], // Systems are not serialized, they will be reloaded
      processes: new Map(),
      boundConstructs: new Set(parsed.boundConstructs || []),
    };
    
    // Convert entities
    if (parsed.entities) {
      for (const [id, entity] of Object.entries(parsed.entities)) {
        newState.entities.set(id, entity as Entity);
      }
    }
    
    // Convert components
    if (parsed.components) {
      for (const [type, entities] of Object.entries(parsed.components)) {
        const entityMap = new Map<EntityId, Component>();
        for (const [entityId, component] of Object.entries(entities as Record<string, any>)) {
          entityMap.set(entityId, component as Component);
        }
        newState.components.set(type, entityMap);
      }
    }
    
    // Convert processes
    if (parsed.processes) {
      for (const [id, process] of Object.entries(parsed.processes)) {
        newState.processes.set(id, process as Process);
      }
    }
    
    // Update the state
    this.state$.next(newState);
    
    // Clean up existing subscriptions
    this.internalSubscriptions.unsubscribe();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    
    // Reinitialize RxJS streams
    this.allEvents$ = new ReplaySubject<JournalEvent>();
    this.liveEvents$ = new Subject<JournalEvent>();
    
    // Set up internal subscriptions
    this.connectLiveEventProcessing();
    
    // Prime the allEvents$ with historical events
    if (newState.events.length > 0) {
      console.log(`Priming allEvents$ with ${newState.events.length} historical events`);
      for (const event of newState.events) {
        this.allEvents$.next(event);
      }
    }
  }

  /**
   * Clears all events from the journal
   */
  public clear(): void {
    const emptyState: JournalState = {
      events: [],
      entities: new Map(),
      components: new Map(),
      systems: [],
      processes: new Map(),
      boundConstructs: new Set(),
    };
    
    // Update the state
    this.state$.next(emptyState);
    
    // Clean up existing subscriptions
    this.internalSubscriptions.unsubscribe();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    
    // Reinitialize RxJS streams
    this.allEvents$ = new ReplaySubject<JournalEvent>();
    this.liveEvents$ = new Subject<JournalEvent>();
    
    // Set up internal subscriptions
    this.connectLiveEventProcessing();
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
    const currentState = this.state$.getValue();
    
    const traverse = (node: any): void => {
      if (!node) {
        return;
      }
      
      // Check if this node is bound
      const nodeId = node.node?.id;
      if (nodeId && !currentState.boundConstructs.has(nodeId)) {
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
        const currentState = this.state$.getValue();
        const system = currentState.systems.find((s: System) => s.id === systemId);
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