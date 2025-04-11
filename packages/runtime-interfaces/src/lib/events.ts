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
   * The timestamp of this event
   */
  timestamp: number;

  /**
   * The payload of this event
   */
  payload: T;

  metadata: EventMetadata
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
  isType: (event: Event<any>) => event is Event<T>;
  
  /**
   * Factory function to create events of this type
   */
  create: (metadata: Omit<EventMetadata, 'type'>, payload: T) => Event<T>;
}

/**
 * Creates an event type definition
 * 
 * @param type The event type
 * @param schema The Zod schema for the event payload
 * @returns An event type definition
 */
export function createEventType<T extends z.ZodTypeAny>(type: string, schema: T): EventTypeDefinition<T> {
  return {
    type,
    schema,
    isType: (event: Event<any>): event is Event<z.infer<T>> => {
      return event.type === type && schema.safeParse(event.payload).success;
    },
    create: (metadata: Omit<EventMetadata, 'type'>, payload: T): Event<T> => {
      return {
        id: metadata.id,
        metadata,
        type,
        payload,
        timestamp: new Date().getTime(),
      };
    }
  };
}
