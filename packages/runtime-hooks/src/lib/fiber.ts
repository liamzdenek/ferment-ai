import { Fiber } from './types.js';

/**
 * Global context for the currently executing fiber
 */
let currentlyExecutingFiber: Fiber | null = null;

/**
 * Hook to access the current fiber
 * 
 * @returns The current fiber
 * @throws Error if called outside a system execution context
 */
export function useCurrentFiber(): Fiber {
  if (!currentlyExecutingFiber) {
    throw new Error('useCurrentFiber must be called within a system execution context');
  }
  return currentlyExecutingFiber;
}

/**
 * Function to run a callback with a specific fiber context
 * 
 * @param fiber The fiber to use as context
 * @param callback The callback to run
 * @returns The result of the callback
 */
export function withFiberContext<T>(fiber: Fiber, callback: () => T): T {
  const previousFiber = currentlyExecutingFiber;
  currentlyExecutingFiber = fiber;
  try {
    return callback();
  } finally {
    currentlyExecutingFiber = previousFiber;
  }
}

/**
 * Creates a new fiber for a system
 * 
 * @param systemId The ID of the system
 * @returns A new fiber
 */
export function createFiber(systemId: string): Fiber {
  return {
    systemId,
    state: {},
    hooks: [],
    hookIndex: 0,
    cleanup: []
  };
}

/**
 * Resets a fiber's hook index for a new execution
 * 
 * @param fiber The fiber to reset
 */
export function resetFiberForExecution(fiber: Fiber): void {
  fiber.hookIndex = 0;
}

/**
 * Runs cleanup functions for a fiber
 * 
 * @param fiber The fiber to clean up
 */
export function runFiberCleanup(fiber: Fiber): void {
  for (const cleanup of fiber.cleanup) {
    try {
      cleanup();
    } catch (error) {
      console.error(`Error in fiber cleanup for system ${fiber.systemId}:`, error);
    }
  }
  fiber.cleanup = [];
}

/**
 * Gets the current fiber or null if not in a system execution context
 * 
 * @returns The current fiber or null
 */
export function getCurrentFiber(): Fiber | null {
  return currentlyExecutingFiber;
}

/**
 * Sets the current fiber
 * 
 * @param fiber The fiber to set as current
 */
export function setCurrentFiber(fiber: Fiber | null): void {
  currentlyExecutingFiber = fiber;
}