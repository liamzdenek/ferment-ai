import { Journal } from './journal.js';
import { Fiber } from './fiber.js';
import { HookFn, BoundHookFn } from './hookFn.js'

/**
 * Hook-based system interface
 * 
 * A system is a component that responds to events and performs actions.
 * In the new hooks-based approach, systems have a single mount function
 * that sets up event handlers and state using hooks.
 */
export interface System {
  /**
   * The unique identifier for this system
   */
  id: string;
  
  /**
   * Mounts the system
   * 
   * This function is called once when the system is registered with the journal.
   * It should set up event handlers and state using hooks.
   * 
   * @param journal The journal
   */
  mount: (props: SystemMountProps) => void;
}

export type GetHookFn = <I extends any[],O>(hookFn: HookFn<I,O>) => BoundHookFn<I,O>;

export interface SystemMountProps {
  getHook: GetHookFn
}