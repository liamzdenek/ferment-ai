import { Fiber, SystemController } from '@ferment-ai/runtime-interfaces';

declare global {
  var fiberAlreadyLoaded: string | undefined;
}

const moduleUrl = import.meta.url;
console.log('module url', moduleUrl);

if (!globalThis.fiberAlreadyLoaded) {
  globalThis.fiberAlreadyLoaded = moduleUrl;
}

if (globalThis.fiberAlreadyLoaded !== moduleUrl) {
  throw new Error(`Module ${moduleUrl} is loaded twice by ${globalThis.fiberAlreadyLoaded}`);
}

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
 * Hook to access the current system controller
 *
 * @returns The current system controller
 * @throws Error if called outside a system execution context
 */
export function useSystemController(): SystemController {
  const fiber = useCurrentFiber();
  return fiber.systemController;
}

/**
 * Gets the current fiber or null if not in a system execution context
 *
 * @returns The current fiber or null
 */
export function getCurrentFiber(): Fiber | null {
  console.log("GETTING FIBER=", currentlyExecutingFiber);
  return currentlyExecutingFiber;
}

/**
 * Sets the current fiber
 *
 * @param fiber The fiber to set as current
 * @returns The previous fiber
 */
export function setCurrentFiber(fiber: Fiber | null): Fiber | null {
  const previousFiber = currentlyExecutingFiber;
  currentlyExecutingFiber = fiber;
  return previousFiber;
}
