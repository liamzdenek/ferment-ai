import { z } from "zod";
import { 
  TaskCallRequest, 
  TaskCallError, 
  TaskCallResult, 
  TaskCallParallelRequest,
  generateTaskExecutionId
} from "../execution/TaskMessaging.js";
import { TaskCtx } from "../execution/TaskCtx.js";
import { WorkflowTask, isWorkflowTask } from "../constructs/WorkflowTask.js";

export type TaskExecutePromise<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => Promise<TaskCallResult | TaskCallError>;

/**
 * Converts a promise-based task execution function to an async generator version
 * that immediately returns the final result without yielding any intermediate values.
 * 
 * @param promiseFn The promise-based task execution function
 * @returns An async generator function that wraps the promise function
 */
export function convertPromiseToGenerator<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  promiseFn: TaskExecutePromise<I, O>
): (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallRequest | TaskCallParallelRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError> {
  const res = async function* generatorWrapper(ctx: TaskCtx<I, O>) {
    // Simply await the promise function and return its result
    const result = await promiseFn(ctx);

    // Return the result without yielding anything
    return result;
  };
  return res;
}

/**
 * Usage:
 * 
 * const runModel = getTaskCall(ctx, agentContext.props.model);
 * const result = yield* runModel({
 *   messages: agentContext.props.initialMessages
 * });
 * // result is now the full TaskCallResult with properly typed output
 */
export function getTaskCall<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  task: WorkflowTask<I, O>
) {
  const maybeConstruct = Object.entries(ctx.nodePathToConstruct).find(([_k, v]) => v.node.path === task.node.path);
  if (maybeConstruct === undefined) {
    throw new Error("Couldn't find a construct with the path: " + task.node.path);
  }
  const [nodePath, construct] = maybeConstruct;
  
  if (!(isWorkflowTask(construct))) {
    throw new Error("Cannot call a task that doesn't implement WorkflowTask");
  }
  
  // Return a generator function that can be called with input
  return function* (input: z.infer<I>): Generator<
    TaskCallRequest, 
    Omit<TaskCallResult, 'output' | 'input'> & { input: z.infer<I>, output: z.infer<O> }, 
    TaskCallResult | TaskCallError
  > {
    const req: TaskCallRequest = {
      type: 'call',
      taskExecutionId: generateTaskExecutionId(), // Add taskExecutionId
      taskDefId: construct.taskDef.taskDefId,
      nodePath,
      input
    };
    
    // Yield the request and get the response
    const res = yield req;

    console.log("Got task call response", res);
    
    // Handle the response
    if (res.type === "error") {
      if(res.error.details instanceof Error) {
        throw res.error.details;
      } else {
        throw new Error("Failed to call task: " + res.error.message);
      }
    }
    
    // Parse the output with the output type schema
    const parsedOutput = construct.taskDef.outputType.parse(res.output);
    
    // Return the full result with the correctly typed output
    return {
      ...res,
      output: parsedOutput
    } as TaskCallResult & { output: z.infer<O> };
  };
}

/**
 * Helper function to find and validate a task construct
 *
 * @param ctx The task context
 * @param task The workflow task to find
 * @returns The node path and construct for the task
 */
function findTaskConstruct<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  task: WorkflowTask<I, O>
): { nodePath: string; construct: WorkflowTask<I, O> } {
  const maybeConstruct = Object.entries(ctx.nodePathToConstruct).find(([_k, v]) => v.node.path === task.node.path);
  if (maybeConstruct === undefined) {
    throw new Error("Couldn't find a construct with the path: " + task.node.path);
  }
  const [nodePath, construct] = maybeConstruct;
  
  if (!(isWorkflowTask(construct))) {
    throw new Error("Cannot call a task that doesn't implement WorkflowTask");
  }
  
  return { nodePath, construct: construct as WorkflowTask<I, O> };
}

/**
 * Overload for array of tasks
 */
export function getTaskCallParallel<T extends WorkflowTask<any, any>>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  tasks: T[]
): (inputs: Array<z.infer<T['taskDef']['inputType']>>) => Generator<
  TaskCallParallelRequest,
  Array<TaskCallResult & { output: z.infer<T['taskDef']['outputType']> }>,
  Array<TaskCallResult | TaskCallError>
>;

/**
 * Overload for tuple of tasks
 */
export function getTaskCallParallel<
  Tasks extends readonly [WorkflowTask<any, any>, ...WorkflowTask<any, any>[]]
>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  tasks: Tasks
): <Inputs extends { [K in keyof Tasks]: z.infer<Tasks[K]['taskDef']['inputType']> }>(
  inputs: Inputs
) => Generator<
  TaskCallParallelRequest,
  { [K in keyof Tasks]: TaskCallResult & { output: z.infer<Tasks[K]['taskDef']['outputType']> } },
  Array<TaskCallResult | TaskCallError>
>;

/**
 * Implementation for both overloads
 *
 * Usage:
 *
 * const runParallel = getTaskCallParallel(ctx, [task1, task2, task3]);
 * const results = yield* runParallel([input1, input2, input3]);
 * // results is now an array of TaskCallResult with properly typed outputs
 *
 * @param ctx The task context
 * @param tasks Array of workflow tasks to call in parallel
 * @returns A generator function that can be called with an array of inputs
 */
export function getTaskCallParallel<T extends WorkflowTask<any, any>>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  tasks: T[] | readonly [T, ...T[]]
): any {
  // Ensure we have at least one task
  if (tasks.length === 0) {
    throw new Error("At least one task is required for parallel execution");
  }

  // Map tasks to their node paths and validate they exist
  const taskInfos = tasks.map(task => findTaskConstruct(ctx, task));
  
  // Return a generator function that can be called with an array of inputs
  return function* (inputs: any[]): Generator<
    TaskCallParallelRequest,
    any,
    Array<TaskCallResult | TaskCallError>
  > {
    if (inputs.length !== tasks.length) {
      throw new Error(`Number of inputs (${inputs.length}) must match number of tasks (${tasks.length})`);
    }
    
    // Create the parallel call request
    const req: TaskCallParallelRequest = {
      type: 'callParallel',
      taskExecutionId: generateTaskExecutionId(), // Add taskExecutionId
      calls: taskInfos.map((info, index) => ({
        taskDefId: info.construct.taskDef.taskDefId,
        nodePath: info.nodePath,
        input: inputs[index]
      }))
    };
    
    // Yield the request and get the responses
    const responses = yield req;
    
    // Process and validate the results
    return responses.map((res, index) => {
      if (res.type === "error") {
        if(res.error.details instanceof Error) {
          throw res.error.details;
        } else {
          throw new Error("Failed to call task: " + res.error.message);
        }
      }
      
      // Parse the output with the output type schema
      const construct = taskInfos[index].construct;
      const parsedOutput = construct.taskDef.outputType.parse(res.output);
      
      // Return the full result with the correctly typed output
      return {
        ...res,
        output: parsedOutput
      };
    });
  };
}