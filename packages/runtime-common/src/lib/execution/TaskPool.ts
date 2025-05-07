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
 * Interface representing a task in the execution tree
 */
interface TaskNode<YieldT, ReturnT, NextT> {
  id: number;
  generator: AsyncGenerator<YieldT, ReturnT, NextT>;
  pendingResult?: Promise<IteratorResult<YieldT, ReturnT>>;
  parentId?: number;
  childIds: number[];
  state: 'pending' | 'running' | 'completed' | 'error';
  result?: ReturnT;
  error?: Error;
  waitingForChildren?: boolean;
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
  // Map to track all tasks in the execution tree
  const tasks = new Map<number, TaskNode<YieldT, ReturnT, NextT>>();
  
  // Map to track pending results for active tasks
  const pendingResults = new Map<number, Promise<IteratorResult<YieldT, ReturnT>>>();
  
  // Collection of final results
  const results: ReturnT[] = [];
  
  // Initialize the task tree with the root generators
  for (let i = 0; i < generators.length; i++) {
    const id = i; // Use 0-based indexing
    const generator = generators[i];
    
    const task: TaskNode<YieldT, ReturnT, NextT> = {
      id,
      generator,
      childIds: [],
      state: 'pending',
      parentId
    };
    
    tasks.set(id, task);
    
    // Start the generator immediately
    pendingResults.set(id, generator.next());
  }
  
  // Process tasks until all are completed
  while (pendingResults.size > 0) {
    // Use Promise.race to get the first task that completes
    const pendingEntries = Array.from(pendingResults.entries());
    
    // Wait for the first task to yield or return
    const [taskId, pendingPromise] = await Promise.race(
      pendingEntries.map(async ([id, promise]) => {
        const result = await promise;
        return [id, result] as [number, IteratorResult<YieldT, ReturnT>];
      })
    );
    
    const task = tasks.get(taskId);
    if (!task) {
      throw new Error(`Invariant violation: Task ID ${taskId} returned by promise doesn't exist in task map`);
    }
    
    const result = pendingPromise;
    
    // Remove the pending result
    pendingResults.delete(taskId);
    
    if (result.done) {
      // Generator is done, process its result
      task.state = 'completed';
      task.result = result.value;
      
      // Process the result with the callback for all tasks
      // This ensures that all task results are properly yielded
      const finalRes = yield* onResultCallback(taskId, result.value);
      
      // Only add root task results to the final results
      if (task.parentId === undefined) {
        results.push(finalRes);
        
        // Also yield the result so it can be processed immediately
        yield finalRes;
      } else {
        // If this task has a parent, check if the parent is waiting for children
        const parentTask = tasks.get(task.parentId);
        if (parentTask && parentTask.waitingForChildren) {
          // The parent is waiting for this child to complete
          // Remove the waiting flag and continue the parent's generator
          parentTask.waitingForChildren = false;
          
          // Continue the parent's generator with the result
          // Use type assertion to fix the type error
          pendingResults.set(parentTask.id, parentTask.generator.next(finalRes as unknown as NextT));
        }
      }
      
      continue;
    }
    
    // Process the yielded value
    const yieldedValue = result.value;
    
    // If the yielded value is a TaskPoolYield, yield it directly without processing
    if (isTaskPoolYield(yieldedValue)) {
      yield yieldedValue as unknown as YieldOutT;
      // Continue the generator without waiting for the callback
      pendingResults.set(taskId, task.generator.next());
      continue;
    }
    
    // Process the yielded value with the callback
    const callbackGenerator = nextValueCallback(taskId, yieldedValue);
    
    // Process all values from the callback generator
    let callbackReturnValue: NextT | undefined = undefined;
    let callbackResult: IteratorResult<YieldOutT, NextT>;
    
    try {
      callbackResult = await callbackGenerator.next();
      
      // Yield all values from the callback generator
      while (!callbackResult.done) {
        // If the callback yields a TaskPoolYield, yield it directly
        yield callbackResult.value;
        
        callbackResult = await callbackGenerator.next();
      }
      
      // Get the final value from the callback
      callbackReturnValue = callbackResult.value;
      
      // Check if this is a subtask creation
      // If the callback returns a value that indicates subtasks were created,
      // mark this task as waiting for children
      if (callbackReturnValue && typeof callbackReturnValue === 'object' && 
          'taskExecutionId' in callbackReturnValue && 'results' in callbackReturnValue) {
        task.waitingForChildren = true;
      }
    } catch (error) {
      // Continue the generator with the error
      pendingResults.set(taskId, task.generator.throw(error));
      continue;
    }
    
    // If the task is waiting for children, don't continue it yet
    if (!task.waitingForChildren) {
      // Continue the generator with the next value
      pendingResults.set(taskId, task.generator.next(callbackReturnValue));
    }
  }
  
  // Return all the results
  return results;
}