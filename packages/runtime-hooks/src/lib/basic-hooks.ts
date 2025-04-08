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
  throw new Error("Unimplemented: useState()");
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
  throw new Error("Unimplemented: useEffect()");
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
  throw new Error("Unimplemented: useOnUnmountCallback()");
}
