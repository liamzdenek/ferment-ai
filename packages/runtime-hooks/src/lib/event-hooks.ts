import { EventCallbackHook } from './types.js';
import { useCurrentFiber } from './fiber.js';
import { withFiberContext } from './fiber.js';
import { useEffect } from './basic-hooks.js';
import * as z from 'zod';

// Define interfaces for events
interface EventMetadata {
  id: string;
  type: string;
  sourceConstructName: string;
  sourceConstructType: string;
  sourceSystemName: string;
  parentEventId?: string;
  timestamp: number;
}

interface EnhancedEvent<T extends z.ZodTypeAny> extends EventMetadata {
  payload: z.infer<T>;
}

interface EventTypeDefinition<T extends z.ZodTypeAny> {
  type: string;
  schema: T; // Zod schema
  isType: (event: EnhancedEvent<any>) => event is EnhancedEvent<z.infer<T>>;
  create: (metadata: Omit<EventMetadata, 'type'>, payload: T) => EnhancedEvent<z.infer<T>>;
}

type FilterPredicate<T> = (value: T) => boolean;

interface EnhancedEventFilter {
  type?: string | string[] | FilterPredicate<string>;
  sourceConstructName?: string | string[] | FilterPredicate<string>;
  sourceConstructType?: string | string[] | FilterPredicate<string>;
  sourceSystemName?: string | string[] | FilterPredicate<string>;
  parentEventId?: string | FilterPredicate<string>;
  payload?: Record<string, any> | FilterPredicate<any>;
  path?: Record<string, any>;
}

// Journal interface (simplified for hooks)
interface Journal {
  subscribe: (listener: (event: any) => void, filter?: any) => string;
  unsubscribe: (id: string) => void;
  publish: (type: string, source: string, payload: any, target?: string) => any;
  getProcess: (processId: string) => any;
  createProcess: (process: any) => string;
  completeProcess: (processId: string, result: any) => void;
  failProcess: (processId: string, error: Error) => void;
  attachProcessToSystem: (processId: string, systemId: string) => void;
  detachProcessFromSystem: (processId: string, systemId: string) => void;
  isSystemBlocked: (systemId: string) => boolean;
  queueEventForSystem: (event: any, systemId: string) => void;
  processQueuedEvents: (systemId: string) => void;
  mountSystem: (system: any) => void;
  unmountSystem: (systemId: string) => void;
}

// Global journal reference - this would be set by the runtime
let globalJournal: Journal | null = null;

/**
 * Sets the global journal reference
 * 
 * @param journal The journal to use
 */
export function setJournal(journal: Journal): void {
  globalJournal = journal;
}

/**
 * Gets the global journal reference
 * 
 * @returns The global journal
 * @throws Error if the journal is not set
 */
export function getJournal(): Journal {
  if (!globalJournal) {
    throw new Error('Journal not set. Call setJournal first.');
  }
  return globalJournal;
}

/**
 * Creates an event callback hook
 * 
 * This hook subscribes to events of a specific type and calls a callback when they occur.
 * 
 * @param eventType The event type definition
 * @param filter Optional additional filter criteria
 * @returns A function that sets the callback
 */
export function useEventCallback<T extends z.ZodTypeAny>(
  eventType: EventTypeDefinition<T>,
  filter?: Omit<EnhancedEventFilter, 'type'>
): (callback: (event: EnhancedEvent<T>) => void) => void {
  const fiber = useCurrentFiber();
  const journal = getJournal();
  const hookIndex = fiber.hookIndex++;
  
  // Combine the event type with any additional filter
  const fullFilter: EnhancedEventFilter = {
    ...filter,
    type: eventType.type
  };
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const eventCallbackHook: EventCallbackHook = {
      type: 'eventCallback',
      eventType: eventType.type,
      filter: fullFilter,
      subscriptionId: null,
      callback: null
    };
    fiber.hooks[hookIndex] = eventCallbackHook;
  }
  
  const hook = fiber.hooks[hookIndex] as EventCallbackHook;
  
  // Return a function that sets the callback
  return (callback: (event: EnhancedEvent<T>) => void) => {
    // If we already have a subscription but the callback changed,
    // unsubscribe and resubscribe
    if (hook.subscriptionId && hook.callback !== callback) {
      journal.unsubscribe(hook.subscriptionId);
      hook.subscriptionId = null;
    }
    
    // Subscribe if we don't have a subscription
    if (!hook.subscriptionId) {
      hook.callback = callback;
      
      // Create a wrapper that ensures the callback runs in the correct fiber context
      const wrappedCallback = (event: any) => {
        withFiberContext(fiber, () => {
          // Validate the event type before calling the callback
          if (eventType.isType(event)) {
            callback(event);
          }
        });
      };
      
      hook.subscriptionId = journal.subscribe(wrappedCallback, hook.filter);
      
      // Add cleanup to fiber using useEffect
      useEffect(() => {
        return () => {
          if (hook.subscriptionId) {
            journal.unsubscribe(hook.subscriptionId);
            hook.subscriptionId = null;
          }
        };
      }, []);
    }
  };
}

// Export the interfaces for use in other files
export type { 
  EnhancedEvent, 
  EventTypeDefinition, 
  EnhancedEventFilter,
  EventMetadata,
  Journal
};