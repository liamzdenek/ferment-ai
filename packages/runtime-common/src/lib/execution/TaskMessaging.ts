import { WorkflowError } from './ErrorHandling.js';

/**
 * Task call and return request
 */
export interface TaskCallAndReturnRequest {
  type: 'callAndReturn';
  taskDefId: string;
  nodePath: string;
  input: any;
}

/**
 * Task call request
 */
export interface TaskCallRequest {
  type: 'call';
  taskDefId: string;
  nodePath: string;
  input: any;
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
export type TaskMessage = TaskCallAndReturnRequest | TaskCallResult;

/**
 * A workflow execution log event
 */
export interface WorkflowLogEvent {
  timestamp: number;
  type: 'task_start' | 'task_complete' | 'task_error' | 'workflow_start' | 'workflow_complete' | 'workflow_error';
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