import { v4 as uuidv4 } from 'uuid';
import { useCurrentFiber, useSystemController } from './fiber.js';
import { useEffect } from './basic-hooks.js';

// Process status type
type ProcessStatus = 'created' | 'running' | 'completed' | 'failed';

// Process interface
interface Process {
  id: string;
  type: string;
  status: ProcessStatus;
  startTime: number;
  endTime?: number;
  result?: any;
  sourceSystemId?: string;
  attachedSystemId?: string;
}

/**
 * Process Manager class
 * 
 * This class is responsible for managing processes for a system.
 * It provides methods to create, attach, and detach processes.
 */
export interface ProcessManager {

  /**
   * Creates a new ProcessManager
   * 
   * This should be called at the top level of a system's mount function.
   */

  /**
   * Attaches a process to the current system
   * 
   * When a process is attached to a system, events for that system will be
   * queued until the process completes.
   * 
   * @param processId The ID of the process to attach
   */
  attachProcess(processId: string): void;

  /**
   * Detaches a process from the current system
   * 
   * @param processId The ID of the process to detach
   */
  detachProcess(processId: string): void;

  /**
   * Checks if the current system is blocked by active processes
   * 
   * @returns Whether the system is blocked
   */
  isBlocked(): boolean;

  /**
   * Creates a process and attaches it to the current system
   * 
   * @param processData The process data to create
   * @returns The ID of the created process
   */
  createAttachedProcess(
    processData: { type: string } & Record<string, any>
  ): string;
}

/**
 * Hook to create a ProcessManager
 * 
 * This hook should be called at the top level of a system's mount function.
 * 
 * @returns A ProcessManager instance
 */
export function useProcessManager(): ProcessManager {
  const fiber = useCurrentFiber();
  const controller = fiber.systemController;
  
  // Register this hook with the system controller
  const hookIndex = controller.registerHook();
  
  const pm: ProcessManager = {
    attachProcess(processId: string): void {
      // Since attachProcess/detachProcess are removed, we'll implement this
      // using events instead
      controller.publishEvent(hookIndex, 'process', {
        action: 'attach',
        processId,
        systemId: controller.systemId
      });
    },
    
    detachProcess(processId: string): void {
      // Since attachProcess/detachProcess are removed, we'll implement this
      // using events instead
      controller.publishEvent(hookIndex, 'process', {
        action: 'detach',
        processId,
        systemId: controller.systemId
      });
    },
    
    isBlocked(): boolean {
      // Since isBlocked is removed, we'll implement a simplified version
      // that always returns false for now
      return false;
    },
    
    createAttachedProcess(processData: { type: string } & Record<string, any>): string {
      // Create a copy of processData without id, status, startTime, and sourceSystemId
      const { id, status, startTime, sourceSystemId, ...restData } = processData;
      
      // Add system ID to the process
      const fullProcess: Process = {
        ...restData,
        id: uuidv4(), // Generate a UUID for the process
        status: 'created',
        startTime: Date.now(),
        sourceSystemId: controller.systemId
      };
      
      // Create the process by publishing an event
      const processId = fullProcess.id;
      controller.publishEvent(hookIndex, 'process', {
        action: 'create',
        process: fullProcess
      });
      
      // Attach the process to the system
      this.attachProcess(processId);
      
      return processId;
    }
  };
  
  // Store the process manager in the hook state
  controller.setHookState(hookIndex, pm);
  
  return pm;
}