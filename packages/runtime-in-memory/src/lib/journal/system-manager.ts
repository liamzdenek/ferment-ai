import { System } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';
import { SystemControllerImpl } from './system-controller.js';

/**
 * Manages systems in the journal
 */
export class SystemManager {
  /**
   * Map of system IDs to systems
   */
  private systems: Map<string, System>;

  /**
   * Map of system IDs to system controllers
   */
  private systemControllers: Map<string, SystemControllerImpl>;

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
    this.systemControllers = new Map();

    // Register initial systems
    for (const system of initialSystems) {
      this.mountSystem(system);
    }
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
   * Gets a system controller
   * 
   * @param systemId The ID of the system to get the controller for
   * @returns The system controller, or undefined if not found
   */
  getSystemController(systemId: string): SystemControllerImpl | undefined {
    return this.systemControllers.get(systemId);
  }

  /**
   * Mounts a hook-based system
   * 
   * @param system The system to mount
   */
  mountSystem(system: System): void {
    // Store the system
    this.systems.set(system.id, system);
    
    // Create a system controller
    const controller = new SystemControllerImpl(system.id, this.journal);
    
    // Store the controller
    this.systemControllers.set(system.id, controller);
    
    // Mount the system using the controller
    controller.mountSystem(system);
  }

  /**
   * Unmounts a system
   * 
   * @param systemId The ID of the system to unmount
   */
  unmountSystem(systemId: string): void {
    // Get the system controller
    const controller = this.systemControllers.get(systemId);
    
    if (!controller) {
      return;
    }
    
    // Unmount the system using the controller
    controller.unmountSystem();
    
    // Remove the system and controller
    this.systems.delete(systemId);
    this.systemControllers.delete(systemId);
  }

  /**
   * Clears all systems
   */
  clear(): void {
    // Unmount all systems
    for (const systemId of this.systemControllers.keys()) {
      this.unmountSystem(systemId);
    }

    // Clear systems and controllers
    this.systems.clear();
    this.systemControllers.clear();
  }
}