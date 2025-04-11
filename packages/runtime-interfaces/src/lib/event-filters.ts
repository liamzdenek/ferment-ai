import { Event } from './events.js';

/**
 * Filter predicate type
 */
export type FilterPredicate<T> = (value: T) => boolean;

/**
 * Enhanced event filter interface
 */
export interface EnhancedEventFilter {
  /**
   * Filter by event type
   */
  type?: string | string[] | FilterPredicate<string>;
  
  /**
   * Filter by source construct name
   */
  sourceConstructName?: string | string[] | FilterPredicate<string>;
  
  /**
   * Filter by source construct type
   */
  sourceConstructType?: string | string[] | FilterPredicate<string>;
  
  /**
   * Filter by source system name
   */
  sourceSystemName?: string | string[] | FilterPredicate<string>;
  
  /**
   * Filter by parent event ID
   */
  parentEventId?: string | FilterPredicate<string>;
  
  /**
   * Filter by payload properties
   */
  payload?: Record<string, any> | FilterPredicate<any>;
  
  /**
   * Filter by nested path expressions
   */
  path?: Record<string, any>;
}

/**
 * Event filter result type
 */
export type EventFilterFn = (event: Event<any>) => boolean;