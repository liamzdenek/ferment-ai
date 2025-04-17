/* eslint-disable require-yield */
import { z } from "zod";
import { TaskCallAndReturnRequest, TaskCallRequest, TaskCallResult, TaskCtx, TaskExecuteGenerator, TaskExecutePromise } from "./workflow.js";
import { WorkflowTask } from "./builtin-constructs.js";

/**
 * Converts a promise-based task execution function to an async generator version
 * that immediately returns the final result without yielding any intermediate values.
 * 
 * @param promiseFn The promise-based task execution function
 * @returns An async generator function that wraps the promise function
 */
export function convertPromiseToGenerator<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  promiseFn: TaskExecutePromise<I, O>
): TaskExecuteGenerator<I, O> {
  return async function* generatorWrapper(ctx: TaskCtx<I, O>): AsyncGenerator<
    TaskCallAndReturnRequest,
    TaskCallRequest | TaskCallResult,
    TaskCallResult
  > {
    // Simply await the promise function and return its result
    const result = await promiseFn(ctx);

    // Return the result without yielding anything
    return result;
  };
}

export function getTaskCall<T extends WorkflowTask<I,O>, I extends z.ZodTypeAny, O extends z.ZodTypeAny>(task: T) {
  
  return {
    getCall() {
      const req: TaskCallAndReturnRequest = {
        type: 'callAndReturn',
        taskDefId: task.taskDef.taskDefId,
        taskId: task.taskDef.toolId,
        input: { "TEST": "INPUT" }

      };
      return req;
    },
    castRes() {
      return null;
    }
  }
}