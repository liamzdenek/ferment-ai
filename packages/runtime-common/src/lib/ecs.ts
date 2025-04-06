/**
 * Entity-Component-System (ECS) interfaces for Ferment AI
 */

/**
 * Entity ID type
 */
export type EntityId = string;

/**
 * Entity interface
 * 
 * An Entity is simply a unique identifier with associated components.
 */
export interface Entity {
  /**
   * The unique identifier for this entity
   */
  id: EntityId;
}

/**
 * Component type
 */
export type ComponentType = string;

/**
 * Component interface
 * 
 * A Component is a pure data object that stores state for an entity.
 */
export interface Component {
  /**
   * The type of this component
   */
  type: ComponentType;
}

/**
 * Process ID type
 */
export type ProcessId = string;

/**
 * Process status
 */
export type ProcessStatus = 'created' | 'running' | 'completed' | 'failed';

/**
 * Process result
 */
export interface ProcessResult {
  /**
   * Whether the process was successful
   */
  success: boolean;

  /**
   * The data returned by the process (if successful)
   */
  data?: any;

  /**
   * The error that occurred (if unsuccessful)
   */
  error?: Error;
}

/**
 * Process interface
 * 
 * A Process represents an operation like an agent call or tool call.
 * It has a start invocation and either fails or succeeds with a single result.
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
}

/**
 * System interface
 * 
 * A System is an event-based callback that responds to journal events and creates Processes.
 */
export interface System {
  /**
   * The unique identifier for this system
   */
  id: string;

  /**
   * The event types this system handles
   */
  eventTypes: string[];

  /**
   * Executes this system in response to an event
   * 
   * @param journal The journal
   * @param event The event
   */
  execute(journal: any, event: any): Promise<void>;
}