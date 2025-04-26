import { WorkflowError } from './ErrorHandling.js';

/**
 * A unique identifier for a specific running task instance
 */
export type TaskExecutionId = string;

/**
 * Helper function to generate unique task execution IDs
 */
export function generateTaskExecutionId(): TaskExecutionId {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Base interface for all task messages
 */
export interface TaskMessage {
  type: string;
  taskExecutionId: TaskExecutionId;
}

/**
 * Task parallel call request
 */
export interface TaskCallRequest extends TaskMessage {
  type: 'call';
  calls: Array<{
    taskDefId: string;
    nodePath: string;
    input: any;
  }>;
}

/**
 * Task call result
 */
export interface TaskCallResult extends TaskMessage {
  type: 'result';
  taskDefId: string;
  nodePath: string;
  input: any;
  output: any;
}

/**
 * Task call error
 */
export interface TaskCallError extends TaskMessage {
  type: 'error';
  taskDefId: string;
  nodePath: string;
  input: any;
  error: {
    message: string;
    details: WorkflowError | Error | unknown;
  };
}

/**
 * Workflow log event types
 */
export type WorkflowLogEventType =
  'task_start' | 'task_complete' | 'task_error' |
  'workflow_start' | 'workflow_complete' | 'workflow_error';

/**
 * A workflow execution log event
 */
export interface WorkflowLogEvent {
  timestamp: number;
  type: WorkflowLogEventType;
  nodePath?: string;
  taskDefId?: string;
  taskExecutionId?: TaskExecutionId; // Added taskExecutionId
  input?: any;
  output?: any;
  error?: WorkflowError | Error;
  taskTree?: any; // For task_tree_updated events
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecutionOptions {
  input?: any;
}

/**
 * Task step result types
 */
export type TaskStepResultType = 'continue' | 'call' | 'callParallel' | 'complete';

/**
 * Result of a task step execution
 */
export type TaskStepResult =
  | { type: 'continue'; executionId: TaskExecutionId }
  | { type: 'call'; childExecutionId: TaskExecutionId; parentExecutionId: TaskExecutionId }
  | { type: 'callParallel'; childExecutionIds: TaskExecutionId[]; parentExecutionId: TaskExecutionId }
  | { type: 'complete'; result: TaskCallResult | TaskCallError };