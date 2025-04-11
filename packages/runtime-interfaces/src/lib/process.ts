import { ProcessId, ProcessStatus, ProcessResult } from './ecs.js';
import { Event } from './events.js';

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
  queuedEvents: Event<any>[];
}