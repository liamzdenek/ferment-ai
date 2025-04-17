/* eslint-disable require-yield */
import { z } from "zod";
import { TaskCallAndReturnRequest, TaskCallError, TaskCallRequest, TaskCallResult, TaskCtx, TaskExecuteFunction } from "./workflow.js";
import { isWorkflowTask, WorkflowTask } from "./builtin-constructs.js";

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
): TaskExecuteFunction<I, O> {
  const res: TaskExecuteFunction<I, O> = async function* generatorWrapper(ctx: TaskCtx<I, O>) {
    // Simply await the promise function and return its result
    const result = await promiseFn(ctx);

    // Return the result without yielding anything
    return result;
  };
  return res;
}

export function getTaskCall<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  task: WorkflowTask<I,O>
) {
  
  const maybeConstruct = Object.entries(ctx.taskIdToConstruct).find(([k, v]) => v.node.path === task.node.path)

  if(maybeConstruct === undefined) {
    throw new Error("Couldn't find a construct with the path: "+task.node.path);
  }

  const [taskId, construct] = maybeConstruct;

  if(!(isWorkflowTask(construct))) {
    throw new Error("Cannot call a task that doesn't implement WorkflowTask");
  }

  return {
    getCall(input: z.infer<I>) {
      const req: TaskCallAndReturnRequest = {
        type: 'callAndReturn',
        taskDefId: construct.taskDef.taskDefId,
        taskId,
        input
      };
      return req;
    },
    castRes(res: TaskCallResult | TaskCallError): z.infer<O> {
      if(res.type === "error") {
        throw new Error("Failed to call task: "+res.type);
      }
      console.log("Got res", res);
      return construct.taskDef.outputType.parse(res.output);
    }
  }
}