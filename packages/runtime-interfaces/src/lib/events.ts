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
