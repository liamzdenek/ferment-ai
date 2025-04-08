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
  private hooks: Array<any> = [];
  private hookIndex: number = 0;
  private cleanup: Array<() => void> = [];
  private state: Record<string, any> = {};

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
    this.publishEvent('system', {
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
    this.publishEvent('system', {
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
    for (const cleanup of this.cleanup) {
      try {
        cleanup();
      } catch (error) {
        console.error(`Error in fiber cleanup for system ${this.systemId}:`, error);
      }
    }
    this.cleanup = [];
  }

  /**
   * Attaches a process to this system
   * 
   * @param processId The ID of the process to attach
   */
  public attachProcess(processId: string): void {
    this.journal.attachProcessToSystem(processId, this.systemId);
  }

  /**
   * Detaches a process from this system
   * 
   * @param processId The ID of the process to detach
   */
  public detachProcess(processId: string): void {
    this.journal.detachProcessFromSystem(processId, this.systemId);
  }

  /**
   * Checks if this system is blocked by active processes
   * 
   * @returns Whether the system is blocked
   */
  public isBlocked(): boolean {
    return this.journal.isSystemBlocked(this.systemId);
  }

  /**
   * Subscribes to events with a callback
   * 
   * @param eventType The event type to subscribe to
   * @param filter Additional filter criteria
   * @param callback The callback to execute when an event is received
   * @returns A subscription ID that can be used to unsubscribe
   */
  public subscribeToEvent(eventType: string, filter: any, callback: (event: any) => void): string {
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
    
    // Store the subscription ID
    this.eventSubscriptions.set(eventType, subscriptionId);
    
    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   * 
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public unsubscribeFromEvent(subscriptionId: string): void {
    this.journal.unsubscribe(subscriptionId);
    
    // Remove the subscription ID from the map
    for (const [eventType, id] of this.eventSubscriptions.entries()) {
      if (id === subscriptionId) {
        this.eventSubscriptions.delete(eventType);
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
  public publishEvent(type: string, payload: Record<string, any>, target?: string): any {
    return this.journal.publish(type, this.systemId, payload, target);
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
   * Gets the hooks array
   */
  public getHooks(): Array<any> {
    return this.hooks;
  }

  /**
   * Sets a hook at a specific index
   */
  public setHook(index: number, hook: any): void {
    this.hooks[index] = hook;
  }

  /**
   * Adds a cleanup function
   */
  public addCleanup(cleanup: () => void): void {
    this.cleanup.push(cleanup);
  }

  /**
   * Gets the state
   */
  public getState(): Record<string, any> {
    return this.state;
  }

  /**
   * Sets a state value
   */
  public setState(key: string, value: any): void {
    this.state[key] = value;
  }
}