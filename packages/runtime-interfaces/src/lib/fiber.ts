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
   * Attaches a process to this system
   *
   * @param processId The ID of the process to attach
   */
  attachProcess(processId: string): void;
  
  /**
   * Detaches a process from this system
   *
   * @param processId The ID of the process to detach
   */
  detachProcess(processId: string): void;
  
  /**
   * Checks if this system is blocked by active processes
   *
   * @returns Whether the system is blocked
   */
  isBlocked(): boolean;
  
  /**
   * Subscribes to events with a callback
   *
   * @param eventType The event type to subscribe to
   * @param filter Additional filter criteria
   * @param callback The callback to execute when an event is received
   * @returns A subscription ID that can be used to unsubscribe
   */
  subscribeToEvent(eventType: string, filter: any, callback: (event: any) => void): string;
  
  /**
   * Unsubscribes from events
   *
   * @param subscriptionId The subscription ID to unsubscribe
   */
  unsubscribeFromEvent(subscriptionId: string): void;
  
  /**
   * Publishes an event
   *
   * @param type The event type
   * @param payload The event payload
   * @param target The event target (optional)
   * @returns The published event
   */
  publishEvent(type: string, payload: Record<string, any>, target?: string): any;
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