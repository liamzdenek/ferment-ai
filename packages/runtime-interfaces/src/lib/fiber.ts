import { System } from './system.js';

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
   * Executes a callback in the context of this system's fiber
   *
   * @param callback The callback to execute
   * @returns The result of the callback
   */
  withFiberContext<T>(callback: () => T): T;
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
  systemController: SystemController;
}