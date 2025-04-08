/**
 * Entity-Component-System (ECS) interfaces for Ferment AI
 */
import { Process } from './process.js';
import { Event } from './events.js';

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