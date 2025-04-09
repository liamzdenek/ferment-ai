import { StateHook, EffectHook, UnmountHook, MemoHook, RefHook, Hook } from './types.js';
import { useCurrentFiber } from './fiber.js';

/**
 * Creates a state hook
 * 
 * Similar to React's useState, this hook creates a stateful value and a function to update it.
 * 
 * @param initialState The initial state or a function that returns the initial state
 * @returns A tuple containing the current state and a function to update it
 */
export function useState<T>(initialState: T | (() => T)): [T, (newState: T) => void] {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  // Get or initialize the hook's state
  let state = controller.getHookState(hookIndex);
  if (state === undefined) {
    state = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
    controller.setHookState(hookIndex, state);
  }
  
  // Return the state and a function to update it
  return [
    state,
    (newState: T) => {
      const nextState = typeof newState === 'function' ? (newState as () => T)() : newState;
      controller.setHookState(hookIndex, nextState);
    }
  ];
}

/**
 * Creates an effect hook
 * 
 * Similar to React's useEffect, this hook runs side effects after the system executes.
 * 
 * @param effect The effect function to run
 * @param deps Optional array of dependencies that determine when the effect should re-run
 */
export function useEffect(effect: () => void | (() => void), deps?: any[]): void {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  // Get the previous state of this hook
  const prevState = controller.getHookState(hookIndex) as EffectHook | undefined;
  
  // Check if deps have changed
  const depsChanged = !prevState || !deps || !prevState.deps ||
    deps.length !== prevState.deps.length ||
    deps.some((dep, i) => dep !== prevState.deps![i]);
  
  if (depsChanged) {
    // Run cleanup from previous effect if it exists
    if (prevState && prevState.cleanup) {
      try {
        prevState.cleanup();
      } catch (error) {
        console.error('Error in effect cleanup:', error);
      }
    }
    
    // Run the effect and store any cleanup function
    const cleanup = effect();
    
    // Store the new state
    controller.setHookState(hookIndex, {
      type: 'effect',
      deps,
      cleanup: typeof cleanup === 'function' ? cleanup : null
    } as EffectHook);
    
    // Register cleanup with the controller
    if (typeof cleanup === 'function') {
      controller.addCleanup(hookIndex, cleanup);
    }
  }
}

/**
 * Creates an unmount hook
 * 
 * This hook registers a callback to be called when the system is unmounted.
 * 
 * @param callback The callback to run when the system is unmounted
 */
export function useOnUnmountCallback(callback: () => void): void {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  // Register the callback as a cleanup function
  controller.addCleanup(hookIndex, callback);
  
  // Store the hook state
  controller.setHookState(hookIndex, {
    type: 'unmount',
    callback
  } as UnmountHook);
}
