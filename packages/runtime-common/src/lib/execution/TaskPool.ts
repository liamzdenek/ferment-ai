import { generateTaskExecutionId } from "./TaskMessaging.js";

/**
 * Type for the callback function that processes a yielded value and returns the next input
 * This callback can also yield values that will be passed through
 */
export type NextValueCallback<YieldT, ReturnT, YieldOutT> =
  (generatorId: number, value: YieldT) => AsyncGenerator<YieldOutT, ReturnT, void>;

export type OnResultCallback<ReturnT, YieldOutT> =
  (generatorId: number, v: ReturnT) => AsyncGenerator<YieldOutT, ReturnT, void>

export interface TaskPoolYield<T> {
  type: 'yield',
  value: T
}

/**
 * Type guard to check if a value is a TaskPoolYield
 */
export function isTaskPoolYield<T>(value: any): value is TaskPoolYield<T> {
  return !!value && typeof value === 'object' && value.type === 'yield';
}


/**
 * Executes a tree of tasks represented by generators, maintaining awareness of the entire call tree
 * 
 * @param generators - Array of generators to execute
 * @param nextValueCallback - Callback to process yielded values and potentially spawn subtasks
 * @param onResultCallback - Callback to process generator results
 * @returns AsyncGenerator that yields values from the generators and callbacks
 */
export async function* executeTaskTree<YieldT, ReturnT = void, NextT = any, YieldOutT = TaskPoolYield<any>>(
  generators: Array<AsyncGenerator<YieldT, ReturnT, NextT>>,
  nextValueCallback: NextValueCallback<YieldT, NextT, YieldOutT>,
  onResultCallback: OnResultCallback<ReturnT, YieldOutT>,
  parentId?: number // Track parent-child relationships
): AsyncGenerator<YieldOutT | ReturnT, ReturnT[], void> {
  throw new Error("Unimplemented");
}