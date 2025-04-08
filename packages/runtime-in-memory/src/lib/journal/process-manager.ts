import { v4 as uuidv4 } from 'uuid';
import { 
  Process, 
  ProcessId, 
  ProcessResult, 
  SystemEventQueue,
  EnhancedEvent,
  JournalEvent
} from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages processes in the journal
 */
export class ProcessManager {
  /**
   * Map of process IDs to processes
   */
  private processes: Map<ProcessId, Process>;

  /**
   * Map of system IDs to event queues
   */
  private systemEventQueues: Map<string, SystemEventQueue>;

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new ProcessManager
   * 
   * @param journal Reference to the journal implementation
   * @param initialProcesses Initial processes
   */
  constructor(
    journal: JournalImpl,
    initialProcesses: Map<ProcessId, Process> = new Map()
  ) {
    this.journal = journal;
    this.processes = new Map(initialProcesses);
    this.systemEventQueues = new Map();
  }

  /**
   * Creates a process
   * 
   * @param process The process to create
   * @returns The ID of the created process
   */
  createProcess(process: Process): ProcessId {
    // Get the process ID
    const id = process.id || uuidv4();

    // Create the process
    const fullProcess: Process = {
      ...process,
      id
    };

    // Store the process
    this.processes.set(id, fullProcess);

    // Publish an event
    this.journal.publish(
      'process',
      'process-manager',
      {
        processId: id,
        action: 'create',
        process: fullProcess
      }
    );

    return id;
  }

  /**
   * Completes a process
   * 
   * @param processId The ID of the process to complete
   * @param result The result of the process
   */
  completeProcess(processId: ProcessId, result: ProcessResult): void {
    // Get the process
    const process = this.processes.get(processId);

    if (!process) {
      return;
    }

    // Update the process
    const updatedProcess: Process = {
      ...process,
      status: 'completed',
      endTime: Date.now(),
      result
    };

    // Store the updated process
    this.processes.set(processId, updatedProcess);

    // Publish an event
    this.journal.publish(
      'process',
      'process-manager',
      {
        processId,
        action: 'complete',
        result
      }
    );

    // If the process was attached to a system, process queued events
    if (process.attachedSystemId) {
      this.processQueuedEvents(process.attachedSystemId);
    }
  }

  /**
   * Fails a process
   * 
   * @param processId The ID of the process to fail
   * @param error The error that caused the process to fail
   */
  failProcess(processId: ProcessId, error: Error): void {
    // Get the process
    const process = this.processes.get(processId);

    if (!process) {
      return;
    }

    // Update the process
    const updatedProcess: Process = {
      ...process,
      status: 'failed',
      endTime: Date.now(),
      result: {
        success: false,
        error: new Error(error.message)
      }
    };

    // Store the updated process
    this.processes.set(processId, updatedProcess);

    // Publish an event
    this.journal.publish(
      'process',
      'process-manager',
      {
        processId,
        action: 'fail',
        error: error.message
      }
    );

    // If the process was attached to a system, process queued events
    if (process.attachedSystemId) {
      this.processQueuedEvents(process.attachedSystemId);
    }
  }

  /**
   * Gets a process
   * 
   * @param processId The ID of the process to get
   * @returns The process, or undefined if not found
   */
  getProcess(processId: ProcessId): Process | undefined {
    return this.processes.get(processId);
  }

  /**
   * Gets all processes
   * 
   * @returns A map of process IDs to processes
   */
  getProcesses(): Map<ProcessId, Process> {
    return new Map(this.processes);
  }

  /**
   * Attaches a process to a system
   * 
   * When a process is attached to a system, events for that system will be
   * queued until the process completes.
   * 
   * @param processId The ID of the process to attach
   * @param systemId The ID of the system to attach the process to
   */
  attachProcessToSystem(processId: string, systemId: string): void {
    // Get the process
    const process = this.processes.get(processId);
    
    if (!process) {
      return;
    }
    
    // Update the process
    const updatedProcess: Process = {
      ...process,
      attachedSystemId: systemId
    };
    
    // Store the updated process
    this.processes.set(processId, updatedProcess);
    
    // Get or create the system event queue
    let queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      queue = {
        systemId,
        activeProcesses: new Set(),
        queuedEvents: []
      };
      this.systemEventQueues.set(systemId, queue);
    }
    
    // Add the process to the queue
    queue.activeProcesses.add(processId);

    // Publish an event
    this.journal.publish(
      'process',
      'process-manager',
      {
        processId,
        systemId,
        action: 'attach'
      }
    );
  }

  /**
   * Detaches a process from a system
   * 
   * @param processId The ID of the process to detach
   * @param systemId The ID of the system to detach the process from
   */
  detachProcessFromSystem(processId: string, systemId: string): void {
    // Get the process
    const process = this.processes.get(processId);
    
    if (!process) {
      return;
    }
    
    // Update the process
    const updatedProcess: Process = {
      ...process,
      attachedSystemId: undefined
    };
    
    // Store the updated process
    this.processes.set(processId, updatedProcess);
    
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return;
    }
    
    // Remove the process from the queue
    queue.activeProcesses.delete(processId);

    // Publish an event
    this.journal.publish(
      'process',
      'process-manager',
      {
        processId,
        systemId,
        action: 'detach'
      }
    );
    
    // If there are no more active processes, process queued events
    if (queue.activeProcesses.size === 0) {
      this.processQueuedEvents(systemId);
    }
  }

  /**
   * Checks if a system is blocked by active processes
   * 
   * @param systemId The ID of the system to check
   * @returns Whether the system is blocked
   */
  isSystemBlocked(systemId: string): boolean {
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return false;
    }
    
    return queue.activeProcesses.size > 0;
  }

  /**
   * Queues an event for a system
   * 
   * If the system is blocked by active processes, the event will be queued
   * until all processes complete.
   * 
   * @param event The event to queue
   * @param systemId The ID of the system to queue the event for
   */
  queueEventForSystem(event: JournalEvent, systemId: string): void {
    // Get or create the system event queue
    let queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      queue = {
        systemId,
        activeProcesses: new Set(),
        queuedEvents: []
      };
      this.systemEventQueues.set(systemId, queue);
    }
    
    // If the system is blocked, queue the event
    if (queue.activeProcesses.size > 0) {
      // Convert JournalEvent to EnhancedEvent
      const enhancedEvent: EnhancedEvent<any> = {
        id: event.id,
        type: event.type,
        sourceConstructName: event.source,
        sourceConstructType: 'unknown',
        sourceSystemName: event.source,
        timestamp: event.timestamp,
        payload: event.payload
      };
      
      queue.queuedEvents.push(enhancedEvent);

      // Publish an event
      this.journal.publish(
        'process',
        'process-manager',
        {
          systemId,
          action: 'queue-event',
          eventId: event.id
        }
      );
    } else {
      // Otherwise, publish the event
      this.journal.publish(event.type, event.source, event.payload, event.target);
    }
  }

  /**
   * Processes queued events for a system
   * 
   * This is called automatically when all processes attached to a system complete.
   * 
   * @param systemId The ID of the system to process queued events for
   */
  processQueuedEvents(systemId: string): void {
    // Get the system event queue
    const queue = this.systemEventQueues.get(systemId);
    
    if (!queue) {
      return;
    }
    
    // If there are no more active processes, process queued events
    if (queue.activeProcesses.size === 0) {
      // Process all queued events
      for (const event of queue.queuedEvents) {
        this.journal.publish(event.type, event.sourceConstructName, event.payload);
      }
      
      // Clear the queue
      queue.queuedEvents = [];

      // Publish an event
      this.journal.publish(
        'process',
        'process-manager',
        {
          systemId,
          action: 'process-queued-events',
          eventCount: queue.queuedEvents.length
        }
      );
    }
  }

  /**
   * Clears all processes
   */
  clear(): void {
    this.processes.clear();
    this.systemEventQueues.clear();
  }
}