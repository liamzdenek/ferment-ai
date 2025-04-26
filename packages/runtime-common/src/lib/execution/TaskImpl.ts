import { z } from "zod";
import { TaskDef } from "../definitions/TaskDef.js";
import { TaskCtx } from "./TaskCtx.js";
import { TaskCallError, TaskCallRequest, TaskCallResult } from "./TaskMessaging.js";

/**
 * Task execution function types
 * 
 * Note: The function signature remains the same to maintain compatibility
 * with existing task implementations, but internally we'll use taskExecutionId
 * to track task instances.
 */
export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>;

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
