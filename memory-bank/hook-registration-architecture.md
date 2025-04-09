# Hook Registration Architecture

## Overview

This document outlines the architecture for implementing a hook registration system in the Ferment framework. The goal is to create a `.registerHook()` function in the system controller that returns an index, which is then used in all other calls from hooks to identify the originating hook.

## Current Implementation

Currently, the SystemController interface in `packages/runtime-interfaces/src/lib/fiber.ts` defines methods for system lifecycle management, event handling, and process management. The implementation in `packages/runtime-in-memory/src/lib/journal/system-controller.ts` already has some hook-related functionality, but it's not fully exposed in the interface.

The hooks in `packages/runtime-hooks/src/lib/` (basic-hooks.ts, event-hooks.ts, process-hooks.ts) use the SystemController to manage their state and lifecycle, but they don't have a consistent way to identify themselves to the controller.

## Proposed Changes

### 1. Update SystemController Interface

The SystemController interface should be updated to include the following methods:

```typescript
/**
 * SystemController interface
 *
 * A SystemController has a 1-to-1 relationship with a System.
 * It's responsible for all lifecycle events, calls in/out of the system,
 * setup, cleanup, and setting the fiber correctly.
 */
export interface SystemController {
  /**
   * The ID of the system this controller manages
   */
  readonly systemId: string;
  
  /**
   * Mounts the system
   *
   * @param system The system to mount
   */
  mountSystem(system: System): void;
  
  /**
   * Unmounts the system
   */
  unmountSystem(): void;
  
  /**
   * Executes a callback in the context of this system's fiber
   *
   * @param callback The callback to execute
   * @returns The result of the callback
   */
  withFiberContext<T>(callback: () => T): T;
  
  /**
   * Runs cleanup functions for the system
   */
  runCleanup(): void;
  
  /**
   * Checks if this system is blocked by active processes
   *
   * @returns Whether the system is blocked
   */
  isBlocked(): boolean;
  
  /**
   * Subscribes to events with a callback
   *
   * @param hookIndex The index of the hook that is subscribing
   * @param eventType The event type to subscribe to
   * @param filter Additional filter criteria
   * @param callback The callback to execute when an event is received
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribeToEvent(hookIndex: number, eventType: string, filter: any, callback: (event: any) => void): string;
  
  /**
   * Unsubscribes from events
   *
   * @param hookIndex The index of the hook that is unsubscribing
   * @param subscriptionId The subscription ID to unsubscribe
   */
  unsubscribeFromEvent(hookIndex: number, subscriptionId: string): void;
  
  /**
   * Publishes an event
   *
   * @param hookIndex The index of the hook that is publishing
   * @param type The event type
   * @param payload The event payload
   * @param target The event target (optional)
   * @returns The published event
   */
  publishEvent(hookIndex: number, type: string, payload: Record<string, any>, target?: string): any;
  
  /**
   * Registers a hook with the system controller
   *
   * @returns The index of the registered hook
   */
  registerHook(): number;
  
  /**
   * Adds a cleanup function for a specific hook
   *
   * @param hookIndex The index of the hook
   * @param cleanup The cleanup function
   */
  addCleanup(hookIndex: number, cleanup: () => void): void;
  
  /**
   * Gets the state for a specific hook
   *
   * @param hookIndex The index of the hook
   * @returns The hook's state
   */
  getHookState(hookIndex: number): any;
  
  /**
   * Sets the state for a specific hook
   *
   * @param hookIndex The index of the hook
   * @param state The new state
   */
  setHookState(hookIndex: number, state: any): void;
}
```

### 2. Update SystemControllerImpl

The SystemControllerImpl class should be updated to implement the new interface methods. The existing implementation already has most of the functionality needed, but it needs to be adjusted to use the hook index for identification.

Key changes:
- Remove `attachProcess` and `detachProcess` methods
- Update event subscription methods to use hook index
- Update state management methods to use hook index
- Ensure cleanup functions are associated with specific hooks

### 3. Update Hook Implementations

All hooks should be updated to use the new registerHook function to get an index, and then use that index in all subsequent calls to the system controller.

For example, the useState hook would be updated like this:

```typescript
export function useState<T>(initialState: T | (() => T)): [T, (newState: T) => void] {
  const fiber = useCurrentFiber();
  const sc = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = sc.registerHook();
  
  // Get or initialize the hook's state
  let state = sc.getHookState(hookIndex);
  if (state === undefined) {
    state = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
    sc.setHookState(hookIndex, state);
  }
  
  // Return the state and a function to update it
  return [
    state,
    (newState: T) => {
      const nextState = typeof newState === 'function' ? (newState as () => T)() : newState;
      sc.setHookState(hookIndex, nextState);
    }
  ];
}
```

Similarly, other hooks like useEffect, useEventCallback, etc. would be updated to use the hook index for identification.

## Implementation Plan

1. Update the SystemController interface in `packages/runtime-interfaces/src/lib/fiber.ts`
2. Update the SystemControllerImpl class in `packages/runtime-in-memory/src/lib/journal/system-controller.ts`
3. Update the hook implementations in `packages/runtime-hooks/src/lib/`
4. Remove attachProcess/detachProcess functions from the interface and implementation
5. Test the changes to ensure everything works correctly

## Benefits

This architecture provides several benefits:

1. **Consistent Identification**: Each hook has a unique identifier that can be used to track its state and lifecycle
2. **Improved Cleanup**: Cleanup functions can be associated with specific hooks, making it easier to manage resources
3. **Better State Management**: State can be stored and retrieved using the hook index, making it more efficient
4. **Simplified Interface**: The interface is more focused on the core functionality needed for hooks

## Conclusion

The proposed architecture provides a clean and efficient way to manage hooks in the Ferment framework. By using a hook registration system, we can ensure that each hook has a unique identifier that can be used to track its state and lifecycle, making the system more robust and easier to maintain.