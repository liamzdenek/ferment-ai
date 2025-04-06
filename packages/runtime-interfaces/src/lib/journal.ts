import type { Entity, EntityId, Component, ComponentType, System, Process, ProcessId, ProcessResult, SystemStateContext, Event } from './ecs.js';

/**
 * Journal event type
 */
export enum EventType {
  /**
   * System event
   */
  SYSTEM = 'system',

  /**
   * User event
   */
  USER = 'user',

  /**
   * Entity event
   */
  ENTITY = 'entity',

  /**
   * Component event
   */
  COMPONENT = 'component',

  /**
   * Process event
   */
  PROCESS = 'process',
}

/**
 * Journal event
 */
export interface JournalEvent extends Event {
  /**
   * Event type
   */
  type: EventType | string;
}

/**
 * Journal event listener
 */
export type EventListener = (event: JournalEvent) => void;

/**
 * Journal event filter
 */
export interface EventFilter {
  /**
   * Event type to filter
   */
  type?: EventType | string;

  /**
   * Event source to filter
   */
  source?: string;

  /**
   * Event target to filter
   */
  target?: string;
}

/**
 * Journal state
 */
export interface JournalState {
  /**
   * Events in the journal
   */
  events: JournalEvent[];

  /**
   * Entities in the journal
   */
  entities: Map<EntityId, Entity>;

  /**
   * Components in the journal, indexed by component type and entity ID
   */
  components: Map<ComponentType, Map<EntityId, Component>>;

  /**
   * Systems in the journal
   */
  systems: System[];

  /**
   * Processes in the journal
   */
  processes: Map<ProcessId, Process>;

  /**
   * IDs of constructs that have been bound
   */
  boundConstructs: Set<string>;
}

/**
 * Journal options
 */
export interface JournalOptions {
  /**
   * Initial state
   */
  initialState?: JournalState;

  /**
   * Whether to enable compression
   */
  enableCompression?: boolean;
}

/**
 * Journal is the central "World" that stores all entities, components, systems, processes, etc.
 * It operates append-only and is the source of truth.
 */
export interface Journal {
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
  ): JournalEvent;

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(listener: EventListener, filter?: EventFilter): string;

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  unsubscribe(id: string): void;

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  getEvents(): JournalEvent[];

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  getFilteredEvents(filter?: EventFilter): JournalEvent[];

  /**
   * Creates an entity
   * 
   * @returns The ID of the created entity
   */
  createEntity(): EntityId;

  /**
   * Removes an entity
   * 
   * @param id The ID of the entity to remove
   */
  removeEntity(id: EntityId): void;

  /**
   * Gets an entity
   * 
   * @param id The ID of the entity to get
   * @returns The entity, or undefined if not found
   */
  getEntity(id: EntityId): Entity | undefined;

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void;

  /**
   * Removes a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void;

  /**
   * Gets a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @returns The component, or undefined if not found
   */
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined;

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  getEntitiesWithComponent(componentType: ComponentType): EntityId[];

  /**
   * Registers a system
   * 
   * @param system The system to register
   */
  registerSystem<T extends Record<string, any> = Record<string, any>, S = any>(system: System<T, S>): void;

  /**
   * Unregisters a system
   * 
   * @param systemId The ID of the system to unregister
   */
  unregisterSystem(systemId: string): void;

  /**
   * Creates a process
   * 
   * @param process The process to create
   * @returns The ID of the created process
   */
  createProcess(process: Process): ProcessId;

  /**
   * Completes a process
   * 
   * @param processId The ID of the process to complete
   * @param result The result of the process
   */
  completeProcess(processId: ProcessId, result: ProcessResult): void;

  /**
   * Fails a process
   * 
   * @param processId The ID of the process to fail
   * @param error The error that caused the process to fail
   */
  failProcess(processId: ProcessId, error: Error): void;

  /**
   * Gets a process
   * 
   * @param processId The ID of the process to get
   * @returns The process, or undefined if not found
   */
  getProcess(processId: ProcessId): Process | undefined;
  
  /**
   * Gets all processes in the journal
   *
   * @returns A map of process IDs to processes
   */
  getProcesses(): Map<ProcessId, Process>;

  /**
   * Marks a construct as bound
   * 
   * @param constructId The ID of the construct to mark as bound
   */
  markConstructAsBound(constructId: string): void;

  /**
   * Validates that all constructs are bound
   * 
   * @param rootConstruct The root construct
   */
  validateAllConstructsBound(rootConstruct: any): void;

  /**
   * Executes the journal starting from an entrypoint
   *
   * @param entrypointId The ID of the entrypoint
   * @param initialPayload Optional initial payload to pass to the entrypoint
   * @returns An async iterable of journal events
   */
  execute(entrypointId: string, initialPayload?: any): AsyncIterable<JournalEvent>;

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  serialize(): string;

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  deserialize(data: string): void;

  /**
   * Clears all events from the journal
   */
  clear(): void;
}