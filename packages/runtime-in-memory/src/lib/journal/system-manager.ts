import { Fiber, GetHookFn, System } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';

interface StoredSystem {
  rawSystem: System
  fiber: Fiber
}

/**
 * Manages systems in the journal
 */
export class SystemManager {
  /**
   * Map of system IDs to systems
   */
  private systems: Map<string, StoredSystem>;

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

    // Register initial systems
    for (const system of initialSystems) {
      this.mountSystem(system);
    }
  }


  /**
   * Mounts a hook-based system
   * 
   * @param system The system to mount
   */
  mountSystem(system: System): void {
    const systemObj: StoredSystem = {
      rawSystem: system,
      fiber: {
        hookPrimitives: {
          mountSystem(newSystem: System) {
            this.mountSystem(newSystem);
          }
        },
        serializableState: {}
      }
    }
    // Store the system
    this.systems.set(system.id, systemObj);
    
    const getHook: GetHookFn = (hookFn) => {
      return hookFn(systemObj.fiber)
    }

    system.mount({
      getHook
    })
  }

  /**
   * Unmounts a system
   * 
   * @param systemId The ID of the system to unmount
   */
  unmountSystem(systemId: string): void {
    // Get the system controller
    const controller = this.systems.get(systemId);
    
    if (!controller) {
      return;
    }

    // TODO: full unmount procedure using the fiber
    
    // Remove the system
    this.systems.delete(systemId);
  }
}