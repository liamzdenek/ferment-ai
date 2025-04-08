import { Journal } from './journal.js';
import { Fiber } from './fiber.js';

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
  mount: (journal: Journal) => void;
}

/**
 * System state interface
 * 
 * This is used internally by the journal to track system state.
 */
export interface SystemState {
  /**
   * The fiber for this system
   */
  fiber: Fiber;
  
  /**
   * Event subscriptions for this system
   */
  eventSubscriptions: Map<string, string>; // eventType -> subscriptionId
}