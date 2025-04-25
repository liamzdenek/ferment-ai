import { WorkflowError } from './ErrorHandling.js';

/**
 * Task call and return request
 */
export interface TaskCallRequest {
  type: 'call';
  taskDefId: string;
  nodePath: string;
  input: any;
}

/**
 * Task parallel call request
 */
export interface TaskCallParallelRequest {
  type: 'callParallel';
  calls: Array<{
    taskDefId: string;
    nodePath: string;
    input: any;
  }>;
}

/**
 * Task call result
 */
export interface TaskCallResult {
  type: 'result';
  taskDefId: string;
  nodePath: string;
  input: any;
  output: any;
}

/**
 * Task call error
 */
export interface TaskCallError {
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
 * Task message type union
 */
export type TaskMessage = TaskCallRequest | TaskCallParallelRequest | TaskCallResult | TaskCallError;

/**
 * Workflow log event types
 */
export type WorkflowLogEventType =
  'task_start' | 'task_complete' | 'task_error' |
  'workflow_start' | 'workflow_complete' | 'workflow_error' |
  'parallel_tasks_start' | 'parallel_tasks_complete';

/**
 * A workflow execution log event
 */
export interface WorkflowLogEvent {
  timestamp: number;
  type: WorkflowLogEventType;
  nodePath?: string;
  taskDefId?: string;
  input?: any;
  output?: any;
  error?: WorkflowError | Error;
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecutionOptions {
  entryPoint: string;
  input?: any;
}