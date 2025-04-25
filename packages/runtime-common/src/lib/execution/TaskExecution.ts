import { z } from 'zod';
import { TaskDef } from '../definitions/TaskDef.js';
import { TaskCtx } from './TaskCtx.js';
import { TaskCallAndReturnRequest, TaskCallError, TaskCallResult } from './TaskMessaging.js';

/**
 * Task execution function types
 */
export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallAndReturnRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>;

/**
 * Task implementation with definition and execution function
 */
export interface TaskImpl<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  def: TaskDef<I, O>;
  nodePath: string;
  execute: TaskExecuteFunction<I, O>;
}

/**
 * A map of node paths to task implementations
 */
export type TaskImplMap = Record<string, TaskImpl<z.ZodTypeAny, z.ZodTypeAny>>;

/**
 * Reconciler callbacks for workflow execution
 */
export interface ReconcilerCallbacks {
  getState: (key: string) => Promise<any>;
  setState: (key: string, value: any) => Promise<void>;
  onTaskStart: (nodePath: string, input: any) => Promise<void>;
  onTaskComplete: (nodePath: string, output: any) => Promise<void>;
  onTaskError: (nodePath: string, error: Error) => Promise<void>;
  onWorkflowStart: () => Promise<void>;
  onWorkflowComplete: () => Promise<void>;
  onWorkflowError: (error: Error) => Promise<void>;
}

/**
 * Information about where to return after a callAndReturn
 */
export interface ReturnToInfo {
  nodePath: string;
  generator: AsyncGenerator<any, any, any>;
}

/**
 * Task execution state
 */
export interface TaskExecutionState {
  nodePath: string;
  input: any;
  generator?: AsyncGenerator<any, any, any>;
  returnTo?: ReturnToInfo;
}

/**
 * Result of a task step execution
 */
export type TaskStepResult =
  | { type: 'continue'; state: TaskExecutionState }
  | { type: 'callAndReturn'; nextTask: TaskExecutionState; returnTo: ReturnToInfo }
  | { type: 'complete'; result: TaskCallResult | TaskCallError };