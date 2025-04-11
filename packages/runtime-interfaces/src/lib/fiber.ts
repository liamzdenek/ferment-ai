import { System } from './system.js';

interface HookPrimitives {
  mountSystem(system: System): void;
}

/**
 * Fiber interface
 *
 * A fiber represents the execution context for a system.
 * It contains a reference to the system controller.
 */
export interface Fiber {
  /**
   * The system controller that manages this fiber
   */
  hookPrimitives: HookPrimitives;
  serializableState: { [k: string]: any } /* eslint-disable-line @typescript-eslint/no-explicit-any */
}