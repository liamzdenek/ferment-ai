import { EventCallbackHook } from './types.js';
import { useCurrentFiber, useSystemController } from './fiber.js';
import { useEffect } from './basic-hooks.js';
import * as z from 'zod';
import { 
  EnhancedEvent, 
  EventTypeDefinition, 
  EnhancedEventFilter
} from '@ferment-ai/runtime-interfaces';

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
): (callback: (event: EnhancedEvent<z.infer<T>>) => void) => void {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  // Get the previous state of this hook
  const prevState = controller.getHookState(hookIndex) as EventCallbackHook | undefined;
  
  // Create a function to set the callback
  return (callback: (event: EnhancedEvent<z.infer<T>>) => void) => {
    // Unsubscribe from previous subscription if it exists
    if (prevState && prevState.subscriptionId) {
      controller.unsubscribeFromEvent(hookIndex, prevState.subscriptionId);
    }
    
    // Subscribe to the event with the new callback
    const subscriptionId = controller.subscribeToEvent(
      hookIndex,
      eventType.type,
      filter || {},
      callback as (event: any) => void
    );
    
    // Store the new state
    controller.setHookState(hookIndex, {
      type: 'eventCallback',
      eventType: eventType.type,
      filter: filter || {},
      subscriptionId,
      callback
    } as EventCallbackHook);
    
    // Add cleanup to unsubscribe when the system is unmounted
    controller.addCleanup(hookIndex, () => {
      if (subscriptionId) {
        controller.unsubscribeFromEvent(hookIndex, subscriptionId);
      }
    });
  };
}

/**
 * Creates a hook to publish events
 *
 * @returns A function to publish events
 */
export function usePublishEvent(): <T extends z.ZodTypeAny>(
  eventType: EventTypeDefinition<T>,
  payload: z.infer<T>,
  target?: string
) => any {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  // Return a function to publish events
  return <T extends z.ZodTypeAny>(
    eventType: EventTypeDefinition<T>,
    payload: z.infer<T>,
    target?: string
  ) => {
    return controller.publishEvent(hookIndex, eventType.type, payload as Record<string, any>, target);
  };
}