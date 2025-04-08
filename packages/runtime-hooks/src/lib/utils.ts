import {
  EnhancedEvent,
  EventTypeDefinition,
  EnhancedEventFilter,
  EventMetadata
} from '@ferment-ai/runtime-interfaces';
import * as z from 'zod';

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
    isType: (event: EnhancedEvent<any>): event is EnhancedEvent<z.infer<T>> => {
      return event.type === type && schema.safeParse(event.payload).success;
    },
    create: (metadata: Omit<EventMetadata, 'type'>, payload: T): EnhancedEvent<T> => {
      return {
        ...metadata,
        type,
        payload,
      };
    }
  };
}

/**
 * Creates an event filter function
 * 
 * @param filter The filter criteria
 * @returns A function that filters events
 */
export function createFilter(filter: EnhancedEventFilter): (event: EnhancedEvent<any>) => boolean {
  return (event: EnhancedEvent<any>) => {
    // Check type
    if (filter.type) {
      if (typeof filter.type === 'function') {
        if (!filter.type(event.type)) return false;
      } else if (Array.isArray(filter.type)) {
        if (!filter.type.includes(event.type)) return false;
      } else if (filter.type !== event.type) {
        return false;
      }
    }
    
    // Check sourceConstructName
    if (filter.sourceConstructName) {
      if (typeof filter.sourceConstructName === 'function') {
        if (!filter.sourceConstructName(event.sourceConstructName)) return false;
      } else if (Array.isArray(filter.sourceConstructName)) {
        if (!filter.sourceConstructName.includes(event.sourceConstructName)) return false;
      } else if (filter.sourceConstructName !== event.sourceConstructName) {
        return false;
      }
    }
    
    // Check sourceConstructType
    if (filter.sourceConstructType) {
      if (typeof filter.sourceConstructType === 'function') {
        if (!filter.sourceConstructType(event.sourceConstructType)) return false;
      } else if (Array.isArray(filter.sourceConstructType)) {
        if (!filter.sourceConstructType.includes(event.sourceConstructType)) return false;
      } else if (filter.sourceConstructType !== event.sourceConstructType) {
        return false;
      }
    }
    
    // Check sourceSystemName
    if (filter.sourceSystemName) {
      if (typeof filter.sourceSystemName === 'function') {
        if (!filter.sourceSystemName(event.sourceSystemName)) return false;
      } else if (Array.isArray(filter.sourceSystemName)) {
        if (!filter.sourceSystemName.includes(event.sourceSystemName)) return false;
      } else if (filter.sourceSystemName !== event.sourceSystemName) {
        return false;
      }
    }
    
    // Check parentEventId
    if (filter.parentEventId) {
      if (typeof filter.parentEventId === 'function') {
        if (!event.parentEventId || !filter.parentEventId(event.parentEventId)) return false;
      } else if (filter.parentEventId !== event.parentEventId) {
        return false;
      }
    }
    
    // Check payload
    if (filter.payload) {
      if (typeof filter.payload === 'function') {
        if (!filter.payload(event.payload)) return false;
      } else {
        // Check each property in the payload filter
        for (const key in filter.payload) {
          if (event.payload[key] !== filter.payload[key]) return false;
        }
      }
    }
    
    // Check path expressions
    if (filter.path) {
      for (const path in filter.path) {
        const parts = path.split('.');
        let value: any = event;
        
        // Navigate the path
        for (const part of parts) {
          if (value === undefined || value === null) return false;
          value = value[part];
        }
        
        // Check the value
        if (value !== filter.path[path]) return false;
      }
    }
    
    return true;
  };
}
