import { z } from 'zod';
import { TaskDef } from '../definitions/TaskDef.js';
import { TaskCtx } from './TaskCtx.js';
import { 
  TaskCallRequest, 
  TaskCallError, 
  TaskCallResult, 
  TaskCallParallelRequest,
  TaskExecutionId,
  TaskStepResult
} from './TaskMessaging.js';
import { TaskNode, TaskTree, WorkflowExecutionState } from './TaskTree.js';

/**
 * Task execution function types
 * 
 * Note: The function signature remains the same to maintain compatibility
 * with existing task implementations, but internally we'll use taskExecutionId
 * to track task instances.
 */
export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallRequest | TaskCallParallelRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>;

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
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
export function isAsyncGeneratorFunction(fn: any): boolean {
  return fn.toString().includes('function*') || fn.toString().includes('async function*');
}

/**
 * Helper function to validate input against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @param input The input to validate
 * @param nodePath The node path of the task for error reporting
 * @param direction Whether this is input or output validation
 * @returns The validated input
 */
export function validateWithZod<T>(
  schema: z.ZodType<T>, 
  input: any, 
  nodePath: string, 
  direction: 'input' | 'output'
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid ${direction} for task ${nodePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a task context for execution
 * 
 * @param executionId The task execution ID
 * @param nodePath The node path of the task
 * @param input The input to the task
 * @param taskImpl The task implementation
 * @param workflowDef The workflow definition
 * @param taskImpls Map of task implementations
 * @param nodePathToConstruct Map of node paths to constructs
 * @returns The task context
 */
export function createTaskContext<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  executionId: TaskExecutionId,
  nodePath: string,
  input: any,
  taskImpl: TaskImpl<I, O>,
  workflowDef: any, // WorkflowDefinition
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: any } // Construct
): TaskCtx<I, O> {
  const taskDef = workflowDef.tasks[nodePath];
  
  // Create the task context
  const taskCtx: TaskCtx<I, O> = {
    taskExecutionId: executionId,
    taskDefId: taskImpl.def.taskDefId,
    nodePath,
    input,
    output: undefined as any,
    canCallTasks: {},
    nodePathToConstruct,
  };
  
  // Populate canCallTasks map
  for (const toolNodePath of taskDef.reachableTasks) {
    if (taskImpls[toolNodePath]) {
      taskCtx.canCallTasks[toolNodePath] = taskImpls[toolNodePath].def;
    }
  }
  
  return taskCtx;
}