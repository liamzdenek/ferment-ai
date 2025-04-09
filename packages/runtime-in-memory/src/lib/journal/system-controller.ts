import { System, SystemController, Fiber } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';
import { setCurrentFiber, useCurrentFiber } from '@ferment-ai/runtime-hooks';

/**
 * Implementation of the SystemController interface
 * 
 * This class is responsible for managing a system's lifecycle and execution context.
 */
export class SystemControllerImpl implements SystemController {
  /**
   * The ID of the system this controller manages
   */
  public readonly systemId: string;

  /**
   * The fiber for this system
   */
  private fiber: Fiber;

  /**
   * Internal fiber state
   */
  private hookIndex: number = 0;
  private hookCleanup: Map<number, Array<() => void>> = new Map();
  private hookState: Map<number, any> = new Map();

  /**
   * Event subscriptions for this system
   */
  private eventSubscriptions: Map<string, string> = new Map();

  /**
   * Reference to the journal implementation
   * This is private to prevent direct access from client code
   */
  private journal: JournalImpl;

  /**
   * The system being managed
   */
  private system: System | null = null;

  /**
   * Global context for the currently executing fiber
   */
  private static currentlyExecutingFiber: Fiber | null = null;

  /**
   * Creates a new SystemControllerImpl
   * 
   * @param systemId The ID of the system to manage
   * @param journal Reference to the journal implementation
   */
  constructor(systemId: string, journal: JournalImpl) {
    this.systemId = systemId;
    this.journal = journal;
    
    // Create a fiber with this controller
    this.fiber = {
      systemController: this
    };
  }

  /**
   * Mounts the system
   * 
   * @param system The system to mount
   */
  public mountSystem(system: System): void {
    if (this.system) {
      throw new Error(`System ${this.systemId} is already mounted`);
    }
    
    this.system = system;
    
    // Mount the system with fiber context
    this.withFiberContext(() => {
      const fiber = useCurrentFiber();
      system.mount(this.journal);
    });
    
    // Publish an event
    // Use a system hook index of 0 for system events
    this.publishEvent(0, 'system', {
      systemId: this.systemId,
      action: 'mount'
    });
  }

  /**
   * Unmounts the system
   */
  public unmountSystem(): void {
    if (!this.system) {
      return;
    }
    
    // Unsubscribe from all events
    for (const subscriptionId of this.eventSubscriptions.values()) {
      this.journal.unsubscribe(subscriptionId);
    }
    
    // Run cleanup functions
    this.runCleanup();
    
    // Clear system reference
    this.system = null;
    
    // Publish an event
    // Use a system hook index of 0 for system events
    this.publishEvent(0, 'system', {
      systemId: this.systemId,
      action: 'unmount'
    });
  }

  /**
   * Executes a callback in the context of this system's fiber
   * 
   * @param callback The callback to execute
   * @returns The result of the callback
   */
  public withFiberContext<T>(callback: () => T): T {
    const previousFiber = setCurrentFiber(this.fiber);
    
    let res: T;
    try {
      res = callback();
    } finally {
      setCurrentFiber(previousFiber);
    }
    return res;
  }

  /**
   * Runs cleanup functions for the system
   */
  public runCleanup(): void {
    // Run all cleanup functions for all hooks
    for (const [hookIndex, cleanupFunctions] of this.hookCleanup.entries()) {
      for (const cleanup of cleanupFunctions) {
        try {
          cleanup();
        } catch (error) {
          console.error(`Error in fiber cleanup for hook ${hookIndex} in system ${this.systemId}:`, error);
        }
      }
    }
    
    // Clear all cleanup functions
    this.hookCleanup.clear();
  }

  /**
   * Subscribes to events with a callback
   * 
   * @param eventType The event type to subscribe to
   * @param filter Additional filter criteria
   * @param callback The callback to execute when an event is received
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribeToEvent(hookIndex: number, eventType: string, filter: any, callback: (event: any) => void): string {
    // Create a wrapper that ensures the callback runs in the correct fiber context
    const wrappedCallback = (event: any) => {
      this.withFiberContext(() => {
        callback(event);
      });
    };
    
    // Combine the event type with any additional filter
    const fullFilter = {
      ...filter,
      type: eventType
    };
    
    // Subscribe to the event
    const subscriptionId = this.journal.subscribe(wrappedCallback, fullFilter);
    
    // Store the subscription ID with the hook index
    this.eventSubscriptions.set(`${hookIndex}:${eventType}`, subscriptionId);
    
    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   * 
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public unsubscribeFromEvent(hookIndex: number, subscriptionId: string): void {
    this.journal.unsubscribe(subscriptionId);
    
    // Remove the subscription ID from the map
    for (const [key, id] of this.eventSubscriptions.entries()) {
      if (id === subscriptionId && key.startsWith(`${hookIndex}:`)) {
        this.eventSubscriptions.delete(key);
        break;
      }
    }
  }

  /**
   * Publishes an event
   * 
   * @param type The event type
   * @param payload The event payload
   * @param target The event target (optional)
   * @returns The published event
   */
  public publishEvent(hookIndex: number, type: string, payload: Record<string, any>, target?: string): any {
    // Add the hook index to the payload for tracking
    const enhancedPayload = {
      ...payload,
      _hookIndex: hookIndex
    };
    
    return this.journal.publish(type, this.systemId, enhancedPayload, target);
  }


  /**
   * Registers a hook with the system controller
   *
   * @returns The index of the registered hook
   */
  public registerHook(): number {
    const index = this.incrementHookIndex();
    // Initialize empty arrays for hook cleanup functions
    this.hookCleanup.set(index, []);
    return index;
  }

  /**
   * Gets the fiber for this system
   * 
   * @returns The fiber
   */
  public getFiber(): Fiber {
    return this.fiber;
  }

  /**
   * Gets the current hook index
   */
  public getHookIndex(): number {
    return this.hookIndex;
  }

  /**
   * Increments the hook index and returns the new value
   */
  public incrementHookIndex(): number {
    return ++this.hookIndex;
  }

  /**
   * Adds a cleanup function for a specific hook
   *
   * @param hookIndex The index of the hook
   * @param cleanup The cleanup function
   */
  public addCleanup(hookIndex: number, cleanup: () => void): void {
    const cleanupFunctions = this.hookCleanup.get(hookIndex) || [];
    cleanupFunctions.push(cleanup);
    this.hookCleanup.set(hookIndex, cleanupFunctions);
  }

  /**
   * Gets the state for a specific hook
   *
   * @param hookIndex The index of the hook
   * @returns The hook's state
   */
  public getHookState(hookIndex: number): any {
    return this.hookState.get(hookIndex);
  }

  /**
   * Sets the state for a specific hook
   *
   * @param hookIndex The index of the hook
   * @param state The new state
   */
  public setHookState(hookIndex: number, state: any): void {
    this.hookState.set(hookIndex, state);
  }
}