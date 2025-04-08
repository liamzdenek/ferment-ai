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
 * Attaches a process to the current system
 * 
 * When a process is attached to a system, events for that system will be
 * queued until the process completes.
 * 
 * @param processId The ID of the process to attach
 */
export function useAttachProcess(processId: string): void {
  const controller = useSystemController();
  
  // Attach the process to the system
  controller.attachProcess(processId);
  
  // Automatically detach when the process completes or when the system is unmounted
  useEffect(() => {
    // Return cleanup function to detach the process when the effect is cleaned up
    return () => {
      controller.detachProcess(processId);
    };
  }, [processId]);
}

/**
 * Checks if the current system is blocked by active processes
 * 
 * @returns Whether the system is blocked
 */
export function useIsSystemBlocked(): boolean {
  const controller = useSystemController();
  
  return controller.isBlocked();
}

/**
 * Creates a process and attaches it to the current system
 *
 * @param processData The process data to create
 * @returns The ID of the created process
 */
export function useCreateAttachedProcess(
  processData: { type: string } & Record<string, any>
): string {
  const controller = useSystemController();
  
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
  controller.publishEvent('process', {
    action: 'create',
    process: fullProcess
  });
  
  // Attach the process to the system
  useAttachProcess(processId);
  
  return processId;
}