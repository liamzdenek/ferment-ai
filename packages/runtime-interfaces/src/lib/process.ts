import { ProcessId, ProcessStatus, ProcessResult } from './ecs.js';
import { EnhancedEvent } from './events.js';

/**
 * Process interface
 * 
 * Represents a process in the journal.
 */
export interface Process {
  /**
   * The unique identifier for this process
   */
  id: ProcessId;

  /**
   * The type of this process
   */
  type: string;

  /**
   * The status of this process
   */
  status: ProcessStatus;

  /**
   * The time this process was started
   */
  startTime: number;

  /**
   * The time this process ended (if completed or failed)
   */
  endTime?: number;

  /**
   * The result of this process (if completed or failed)
   */
  result?: ProcessResult;
  
  /**
   * The ID of the system that created this process
   */
  sourceSystemId?: string;
  
  /**
   * The ID of the system that this process is attached to
   */
  attachedSystemId?: string;
}

/**
 * System event queue interface
 * 
 * Represents a queue of events for a system that is blocked by active processes.
 */
export interface SystemEventQueue {
  /**
   * The ID of the system
   */
  systemId: string;
  
  /**
   * The IDs of active processes attached to this system
   */
  activeProcesses: Set<string>;
  
  /**
   * Events queued for this system
   */
  queuedEvents: EnhancedEvent<any>[];
}

/**
 * Journal process management extensions
 * 
 * These methods extend the Journal interface to support process attachment.
 */
export interface JournalProcessExtensions {
  /**
   * Attaches a process to a system
   * 
   * When a process is attached to a system, events for that system will be
   * queued until the process completes.
   * 
   * @param processId The ID of the process to attach
   * @param systemId The ID of the system to attach the process to
   */
  attachProcessToSystem(processId: string, systemId: string): void;
  
  /**
   * Detaches a process from a system
   * 
   * @param processId The ID of the process to detach
   * @param systemId The ID of the system to detach the process from
   */
  detachProcessFromSystem(processId: string, systemId: string): void;
  
  /**
   * Checks if a system is blocked by active processes
   * 
   * @param systemId The ID of the system to check
   * @returns Whether the system is blocked
   */
  isSystemBlocked(systemId: string): boolean;
  
  /**
   * Queues an event for a system
   * 
   * If the system is blocked by active processes, the event will be queued
   * until all processes complete.
   * 
   * @param event The event to queue
   * @param systemId The ID of the system to queue the event for
   */
  queueEventForSystem(event: EnhancedEvent<any>, systemId: string): void;
  
  /**
   * Processes queued events for a system
   * 
   * This is called automatically when all processes attached to a system complete.
   * 
   * @param systemId The ID of the system to process queued events for
   */
  processQueuedEvents(systemId: string): void;
}