import { v4 as uuidv4 } from 'uuid';
import { RootConstruct } from 'constructs';
import { Observable, BehaviorSubject } from 'rxjs';
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
  EventTypeDefinition
} from '@ferment-ai/runtime-interfaces';

// Import managers
import { EventManager } from './journal/event-manager.js';
import { EventTypeManager } from './journal/event-type-manager.js';
import { EntityManager } from './journal/entity-manager.js';
import { ComponentManager } from './journal/component-manager.js';
import { SystemManager } from './journal/system-manager.js';
import { SerializationManager } from './journal/serialization-manager.js';

/**
 * Implementation of the Journal interface using RxJS
 */
export class JournalImpl implements Journal {
  /**
   * The state of the journal
   */
  private state$: BehaviorSubject<JournalState>;

  /**
   * Event manager
   */
  private eventManager: EventManager;

  /**
   * Event type manager
   */
  private eventTypeManager: EventTypeManager;

  /**
   * Entity manager
   */
  private entityManager: EntityManager;

  /**
   * Component manager
   */
  private componentManager: ComponentManager;

  /**
   * System manager
   */
  private systemManager: SystemManager;

  /**
   * Serialization manager
   */
  private serializationManager: SerializationManager;

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

    // Initialize managers
    this.eventTypeManager = new EventTypeManager(this);
    this.eventManager = new EventManager(this, options.initialState?.events || []);
    this.entityManager = new EntityManager(this, options.initialState?.entities);
    this.componentManager = new ComponentManager(this, options.initialState?.components);
    this.systemManager = new SystemManager(this, options.initialState?.systems || []);
    this.serializationManager = new SerializationManager(this, options.enableCompression);
  }

  /**
   * Gets the event manager
   * 
   * @returns The event manager
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * Gets the event type manager
   * 
   * @returns The event type manager
   */
  getEventTypeManager(): EventTypeManager {
    return this.eventTypeManager;
  }

  /**
   * Gets the entity manager
   * 
   * @returns The entity manager
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Gets the component manager
   * 
   * @returns The component manager
   */
  getComponentManager(): ComponentManager {
    return this.componentManager;
  }

  /**
   * Gets the system manager
   * 
   * @returns The system manager
   */
  getSystemManager(): SystemManager {
    return this.systemManager;
  }

  /**
   * Gets the serialization manager
   * 
   * @returns The serialization manager
   */
  getSerializationManager(): SerializationManager {
    return this.serializationManager;
  }

  /**
   * Validates an event payload
   * 
   * @param type The event type
   * @param payload The event payload
   * @returns Whether the payload is valid
   */
  validateEventPayload(type: string, payload: Record<string, any>): boolean {
    const eventType = this.eventTypeManager.getEventTypeByString(type);
    if (!eventType) {
      return false;
    }
    return this.eventTypeManager.validateEventPayload(eventType, payload);
  }

  /**
   * Registers an event type
   * 
   * @param eventType The event type to register
   */
  registerEventType(eventType: EventTypeDefinition<any>): void {
    this.eventTypeManager.registerEventType(eventType);
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
    return this.eventManager.publish(type, source, payload, target);
  }

  /**
   * Subscribes to events in the journal
   * 
   * @param listener The event listener
   * @param filter The event filter
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribe(listener: EventListener, filter?: EventFilter): string {
    return this.eventManager.subscribe(listener, filter);
  }

  /**
   * Unsubscribes from events in the journal
   * 
   * @param id The subscription ID
   */
  unsubscribe(id: string): void {
    this.eventManager.unsubscribe(id);
  }

  /**
   * Gets all events in the journal
   * 
   * @returns All events in the journal
   */
  getEvents(): JournalEvent[] {
    return this.eventManager.getEvents();
  }

  /**
   * Gets events in the journal that match a filter
   * 
   * @param filter The event filter
   * @returns Events that match the filter
   */
  getFilteredEvents(filter?: EventFilter): JournalEvent[] {
    return this.eventManager.getFilteredEvents(filter);
  }

  /**
   * Creates an entity
   * 
   * @returns The ID of the created entity
   */
  createEntity(): EntityId {
    const id = this.entityManager.createEntity();
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      entities: this.entityManager.getAllEntities()
    });
    
    return id;
  }

  /**
   * Removes an entity
   * 
   * @param id The ID of the entity to remove
   */
  removeEntity(id: EntityId): void {
    this.entityManager.removeEntity(id);
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      entities: this.entityManager.getAllEntities()
    });
  }

  /**
   * Gets an entity
   * 
   * @param id The ID of the entity to get
   * @returns The entity, or undefined if not found
   */
  getEntity(id: EntityId): Entity | undefined {
    return this.entityManager.getEntity(id);
  }

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void {
    this.componentManager.addComponent(entityId, componentType, component);
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      components: this.componentManager.getAllComponents()
    });
  }

  /**
   * Removes a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    this.componentManager.removeComponent(entityId, componentType);
    
    // Update state
    this.state$.next({
      ...this.state$.value,
      components: this.componentManager.getAllComponents()
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
    return this.componentManager.getComponent<T>(entityId, componentType);
  }

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    return this.componentManager.getEntitiesWithComponent(componentType);
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
    return this.eventManager.getEventStream();
  }

  /**
   * Serializes the journal to a string
   * 
   * @returns The serialized journal
   */
  serialize(): string {
    return this.serializationManager.serialize(this.state$.value);
  }

  /**
   * Deserializes the journal from a string
   * 
   * @param data The serialized journal
   */
  deserialize(data: string): void {
    const state = this.serializationManager.deserialize(data);
    
    // Update state
    this.state$.next(state);
    
    // Reinitialize managers with the new state
    this.eventManager = new EventManager(this, state.events);
    this.entityManager = new EntityManager(this, state.entities);
    this.componentManager = new ComponentManager(this, state.components);
    this.systemManager = new SystemManager(this, state.systems);
  }

  /**
   * Mounts a hook-based system
   * 
   * @param system The system to mount
   */
  mountSystem(system: System): void {
    this.systemManager.mountSystem(system);
  }

  /**
   * Unmounts a system
   * 
   * @param systemId The ID of the system to unmount
   */
  unmountSystem(systemId: string): void {
    this.systemManager.unmountSystem(systemId);
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