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
  const hookIndex = fiber.hookIndex++;
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const initialValue = typeof initialState === 'function' 
      ? (initialState as () => T)() 
      : initialState;
    const stateHook: StateHook<T> = {
      type: 'state',
      state: initialValue
    };
    fiber.hooks[hookIndex] = stateHook;
  }
  
  const hook = fiber.hooks[hookIndex] as StateHook<T>;
  
  const setState = (newState: T) => {
    hook.state = newState;
    // In a real implementation, this would trigger a re-execution of the system
    // For now, we'll just update the state
  };
  
  return [hook.state, setState];
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
  const hookIndex = fiber.hookIndex++;
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const effectHook: EffectHook = {
      type: 'effect',
      deps: deps || null,
      cleanup: null
    };
    fiber.hooks[hookIndex] = effectHook;
  }
  
  const hook = fiber.hooks[hookIndex] as EffectHook;
  
  // Check if deps have changed
  const depsChanged = !hook.deps || !deps || 
    deps.length !== hook.deps.length || 
    hook.deps.some((dep, i) => dep !== deps[i]);
  
  if (depsChanged) {
    // Run cleanup if it exists
    if (hook.cleanup) {
      hook.cleanup();
    }
    
    // Run effect and store cleanup
    const cleanup = effect();
    hook.cleanup = typeof cleanup === 'function' ? cleanup : null;
    hook.deps = deps || null;
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
  const hookIndex = fiber.hookIndex++;
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const unmountHook: UnmountHook = {
      type: 'unmount',
      callback
    };
    fiber.hooks[hookIndex] = unmountHook;
    fiber.cleanup.push(callback);
  } else {
    const hook = fiber.hooks[hookIndex] as UnmountHook;
    // Update the callback if it changed
    if (hook.callback !== callback) {
      // Remove the old callback from cleanup
      const index = fiber.cleanup.indexOf(hook.callback);
      if (index !== -1) {
        fiber.cleanup.splice(index, 1);
      }
      // Add the new callback
      hook.callback = callback;
      fiber.cleanup.push(callback);
    }
  }
}

/**
 * Creates a memo hook
 * 
 * Similar to React's useMemo, this hook memoizes a value.
 * 
 * @param factory The factory function that creates the value
 * @param deps Array of dependencies that determine when the value should be recalculated
 * @returns The memoized value
 */
export function useMemo<T>(factory: () => T, deps: any[]): T {
  const fiber = useCurrentFiber();
  const hookIndex = fiber.hookIndex++;
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const memoHook: MemoHook<T> = {
      type: 'memo',
      deps: null,
      value: factory()
    };
    fiber.hooks[hookIndex] = memoHook;
  }
  
  const hook = fiber.hooks[hookIndex] as MemoHook<T>;
  
  // Check if deps have changed
  const depsChanged = !hook.deps || 
    deps.length !== hook.deps.length || 
    hook.deps.some((dep, i) => dep !== deps[i]);
  
  if (depsChanged) {
    hook.value = factory();
    hook.deps = deps;
  }
  
  return hook.value;
}

/**
 * Creates a ref hook
 * 
 * Similar to React's useRef, this hook creates a mutable reference.
 * 
 * @param initialValue The initial value of the ref
 * @returns The ref object
 */
export function useRef<T>(initialValue: T): { current: T } {
  const fiber = useCurrentFiber();
  const hookIndex = fiber.hookIndex++;
  
  // Initialize hook if needed
  if (hookIndex >= fiber.hooks.length) {
    const refHook: RefHook<T> = {
      type: 'ref',
      current: initialValue
    };
    fiber.hooks[hookIndex] = refHook;
  }
  
  const hook = fiber.hooks[hookIndex] as RefHook<T>;
  
  return { current: hook.current };
}