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
 * Generic event interface
 */
export interface Event<T = any> {
  /**
   * The unique identifier for this event
   */
  id: string;

  /**
   * The type of this event
   */
  type: string;

  /**
   * The source of this event
   */
  source: string;

  /**
   * The target of this event (optional)
   */
  target?: string;

  /**
   * The timestamp of this event
   */
  timestamp: number;

  /**
   * The payload of this event
   */
  payload: T;
}

/**
 * System state context
 */
export interface SystemStateContext<S = any> {
  /**
   * Gets the current state
   */
  getState(): S;

  /**
   * Sets the new state
   */
  setState(state: S): void;
}

/**
 * System interface
 * 
 * A System is an event-based callback that responds to journal events and creates Processes.
 */
export interface System<T extends Record<string, any> = Record<string, any>, S = any> {
  /**
   * The unique identifier for this system
   */
  id: string;

  /**
   * The event types this system handles
   */
  eventTypes: string[];

  /**
   * The initial state for this system
   */
  initialState: S;

  /**
   * Executes this system in response to an event
   * 
   * @param journal The journal
   * @param event The event
   * @param stateContext The state context
   */
  execute<K extends keyof T>(
    journal: any, 
    event: Event<T[K]> & { type: K & string },
    stateContext: SystemStateContext<S>
  ): Promise<void>;
}

/**
 * System state component
 */
export interface SystemStateComponent extends Component {
  /**
   * The type of this component
   */
  type: 'SystemStateComponent';
  
  /**
   * The ID of the system this state belongs to
   */
  systemId: string;
  
  /**
   * The state data
   */
  state: any;
}