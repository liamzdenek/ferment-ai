import { System, SystemState } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';
import { 
  createFiber, 
  withFiberContext, 
  runFiberCleanup 
} from '@ferment-ai/runtime-hooks';

/**
 * Manages systems in the journal
 */
export class SystemManager {
  /**
   * Map of system IDs to systems
   */
  private systems: Map<string, System>;

  /**
   * Map of system IDs to hook-based system state
   */
  private hookSystems: Map<string, SystemState>;

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new SystemManager
   * 
   * @param journal Reference to the journal implementation
   * @param initialSystems Initial systems
   */
  constructor(
    journal: JournalImpl,
    initialSystems: System[] = []
  ) {
    this.journal = journal;
    this.systems = new Map();
    this.hookSystems = new Map();

    // Register initial systems
    for (const system of initialSystems) {
      this.registerSystem(system);
    }
  }

  /**
   * Registers a system
   * 
   * @param system The system to register
   */
  registerSystem(system: System): void {
    // Store the system
    this.systems.set(system.id, system);

    // Publish an event
    this.journal.publish(
      'system',
      'system-manager',
      {
        systemId: system.id,
        action: 'register'
      }
    );
  }

  /**
   * Unregisters a system
   * 
   * @param systemId The ID of the system to unregister
   */
  unregisterSystem(systemId: string): void {
    // Get the system
    const system = this.systems.get(systemId);

    if (!system) {
      return;
    }

    // Remove the system
    this.systems.delete(systemId);

    // Publish an event
    this.journal.publish(
      'system',
      'system-manager',
      {
        systemId,
        action: 'unregister'
      }
    );
  }

  /**
   * Gets a system
   * 
   * @param systemId The ID of the system to get
   * @returns The system, or undefined if not found
   */
  getSystem(systemId: string): System | undefined {
    return this.systems.get(systemId);
  }

  /**
   * Gets all systems
   * 
   * @returns All systems
   */
  getAllSystems(): System[] {
    return Array.from(this.systems.values());
  }

  /**
   * Mounts a hook-based system
   * 
   * @param system The system to mount
   */
  mountSystem(system: System): void {
    // Create a fiber for the system
    const fiber = createFiber(system.id);
    
    // Create system state
    const systemState: SystemState = {
      fiber,
      eventSubscriptions: new Map()
    };
    
    // Store the system state
    this.hookSystems.set(system.id, systemState);
    
    // Mount the system
    withFiberContext(fiber, () => {
      system.mount(this.journal);
    });

    // Publish an event
    this.journal.publish(
      'system',
      'system-manager',
      {
        systemId: system.id,
        action: 'mount'
      }
    );
  }

  /**
   * Unmounts a system
   * 
   * @param systemId The ID of the system to unmount
   */
  unmountSystem(systemId: string): void {
    // Get the system state
    const systemState = this.hookSystems.get(systemId);
    
    if (!systemState) {
      return;
    }
    
    // Unsubscribe from all events
    for (const subscriptionId of systemState.eventSubscriptions.values()) {
      this.journal.unsubscribe(subscriptionId);
    }
    
    // Run cleanup functions
    runFiberCleanup(systemState.fiber);
    
    // Remove the system state
    this.hookSystems.delete(systemId);

    // Publish an event
    this.journal.publish(
      'system',
      'system-manager',
      {
        systemId,
        action: 'unmount'
      }
    );
  }

  /**
   * Gets a system state
   * 
   * @param systemId The ID of the system to get the state for
   * @returns The system state, or undefined if not found
   */
  getSystemState(systemId: string): SystemState | undefined {
    return this.hookSystems.get(systemId);
  }

  /**
   * Clears all systems
   */
  clear(): void {
    // Unmount all systems
    for (const systemId of this.hookSystems.keys()) {
      this.unmountSystem(systemId);
    }

    // Clear systems
    this.systems.clear();
  }
}