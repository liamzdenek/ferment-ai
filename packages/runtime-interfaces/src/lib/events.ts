import { z } from 'zod';

/**
 * Generic event interface
 */
export interface Event<T = any> {
  /**
   * The unique identifier for this event
   */
  id: string;

  /**
   * The type of this event
   */
  type: string;

  /**
   * The source of this event
   */
  source: string;

  /**
   * The target of this event (optional)
   */
  target?: string;

  /**
   * The timestamp of this event
   */
  timestamp: number;

  /**
   * The payload of this event
   */
  payload: T;
}

/**
 * Event metadata interface
 */
export interface EventMetadata {
  /**
   * Unique identifier for the event
   */
  id: string;
  
  /**
   * Event type identifier
   */
  type: string;
  
  /**
   * Name of the source construct
   */
  sourceConstructName: string;
  
  /**
   * Type of the source construct
   */
  sourceConstructType: string;
  
  /**
   * Name of the source system
   */
  sourceSystemName: string;
  
  /**
   * Optional parent event ID for hierarchical events
   */
  parentEventId?: string;
  
  /**
   * When the event was created
   */
  timestamp: number;
}

/**
 * Enhanced event interface with strongly typed payload
 */
export interface EnhancedEvent<T = unknown> extends EventMetadata {
  /**
   * Strongly typed payload
   */
  payload: T;
}

/**
 * Event type definition interface
 */
export interface EventTypeDefinition<T = unknown> {
  /**
   * Event type identifier
   */
  type: string;
  
  /**
   * Zod schema for payload validation
   */
  schema: z.ZodType<T>;
  
  /**
   * Type guard function
   */
  isType: (event: EnhancedEvent<any>) => event is EnhancedEvent<T>;
  
  /**
   * Factory function to create events of this type
   */
  create: (metadata: Omit<EventMetadata, 'type'>, payload: T) => EnhancedEvent<T>;
}

/**
 * Module event registry interface
 */
export interface ModuleEventRegistry {
  /**
   * Registers an event type with the registry
   * 
   * @param eventType The event type to register
   */
  registerEventType<T>(eventType: EventTypeDefinition<T>): void;
  
  /**
   * Checks if an event type is registered
   * 
   * @param type The event type to check
   * @returns Whether the event type is registered
   */
  isRegistered(type: string): boolean;
  
  /**
   * Gets an event type from the registry
   * 
   * @param type The event type to get
   * @returns The event type definition, or undefined if not found
   */
  getEventType<T>(type: string): EventTypeDefinition<T> | undefined;
  
  /**
   * Gets all registered event types
   * 
   * @returns All registered event types
   */
  getAllEventTypes(): EventTypeDefinition<any>[];
}

/**
 * Journal event registry interface
 */
export interface JournalEventRegistry {
  /**
   * Registers a module event registry with the journal
   * 
   * @param moduleId The ID of the module
   * @param registry The module event registry
   */
  registerModuleRegistry(moduleId: string, registry: ModuleEventRegistry): void;
  
  /**
   * Gets a module event registry
   * 
   * @param moduleId The ID of the module
   * @returns The module event registry, or undefined if not found
   */
  getModuleRegistry(moduleId: string): ModuleEventRegistry | undefined;
  
  /**
   * Checks if an event type is registered with any module
   * 
   * @param type The event type to check
   * @returns Whether the event type is registered
   */
  isEventTypeRegistered(type: string): boolean;
  
  /**
   * Gets an event type from any module
   * 
   * @param type The event type to get
   * @returns The event type definition, or undefined if not found
   */
  getEventType<T>(type: string): EventTypeDefinition<T> | undefined;
}