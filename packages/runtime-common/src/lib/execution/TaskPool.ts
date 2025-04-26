import { generateTaskExecutionId } from "./TaskMessaging.js";

/**
 * Type for the callback function that processes a yielded value and returns the next input
 * This callback can also yield values that will be passed through
 */
export type NextValueCallback<YieldT, ReturnT, YieldOutT> =
  (generatorId: string, value: YieldT) => AsyncGenerator<YieldOutT, ReturnT, void>;

export interface TaskPoolYield<T> {
  type: 'yield',
  value: T
}

/**
 * Type guard to check if a value is a TaskPoolYield
 */
export function isTaskPoolYield<T>(value: any): value is TaskPoolYield<T> {
  return value && typeof value === 'object' && value.type === 'yield';
}

/**
 * A pool of async generators that can be executed in parallel
 * This class manages multiple generators and allows them to run concurrently
 * 
 * @template G - The type of generators in the pool
 * @template YieldT - The type of values yielded by the generators
 * @template ReturnT - The type of values returned by the generators
 * @template NextT - The type of values passed to the generators' next() method
 * @template YieldOutT - The type of values yielded by the callback and passed through
 */
export class TaskPool<YieldT, ReturnT = void, CallbackReturnT = ReturnT, YieldOutT = TaskPoolYield<any>> {
  private generators = new Map<string, AsyncGenerator<YieldT, ReturnT, CallbackReturnT>>();
  private nextValueCallback: NextValueCallback<YieldT, CallbackReturnT, YieldOutT>;
  private pendingResults = new Map<string, Promise<IteratorResult<YieldT, ReturnT>>>();
  
  /**
   * Create a new TaskPool
   * @param nextValueCallback A callback function that processes yielded values and returns the next input
   */
  constructor(nextValueCallback: NextValueCallback<YieldT, CallbackReturnT, YieldOutT>) {
    this.nextValueCallback = nextValueCallback;
  }
  
  /**
   * Add a generator to the pool
   * @param generator The generator to add
   * @returns The ID of the generator in the pool
   */
  push(generator: AsyncGenerator<YieldT, ReturnT, CallbackReturnT>): string {
    const id = generateTaskExecutionId();
    this.generators.set(id, generator);
    // Start the generator immediately to ensure parallel execution
    this.pendingResults.set(id, generator.next());
    return id;
  }
  
  /**
   * Process all generators in the pool and yield values from the callback
   * This is an async generator that yields values from the callback
   */
  async *next(): AsyncGenerator<YieldOutT | ReturnT, ReturnT[], unknown> {
    const results: ReturnT[] = [];
    
    // Continue processing until all generators are done
    while (this.hasActiveGenerators()) {
      // Use Promise.race to get the first generator that completes
      const pendingEntries = Array.from(this.pendingResults.entries());
      if (pendingEntries.length === 0) break;
      
      // Wait for the first generator to yield or return
      const [id, pendingPromise] = await Promise.race(
        pendingEntries.map(async ([id, promise]) => {
          const result = await promise;
          return [id, result] as [string, IteratorResult<YieldT, ReturnT>];
        })
      );
      
      const generator = this.generators.get(id)!;
      const result = pendingPromise;
      
      // Remove the pending result
      this.pendingResults.delete(id);
      
      if (result.done) {
        // Generator is done, remove it from the pool and store its result
        this.generators.delete(id);
        results.push(result.value);
        // Also yield the result so it can be processed immediately
        yield result.value;
        continue;
      }
      
      // Process the yielded value
      const yieldedValue = result.value;
      
      // If the yielded value is a TaskPoolYield, yield it directly without processing
      if (isTaskPoolYield(yieldedValue)) {
        yield yieldedValue as unknown as YieldOutT;
        // Continue the generator without waiting for the callback
        this.pendingResults.set(id, generator.next());
        continue;
      }
      
      // Process the yielded value with the callback
      const callbackGenerator = this.nextValueCallback(id, yieldedValue);
      
      // Process all values from the callback generator
      let callbackReturnValue: CallbackReturnT | undefined = undefined;
      let callbackResult: IteratorResult<YieldOutT, CallbackReturnT>;
      
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
      } catch (error) {
        console.error("Error in callback generator:", error);
        // Continue the generator with the error
        this.pendingResults.set(id, generator.throw(error));
        continue;
      }
      
      // Continue the generator with the next value
      this.pendingResults.set(id, generator.next(callbackReturnValue));
    }
    
    // Return all the results
    return results;
  }
  
  /**
   * Check if the pool has any active generators
   * @returns True if the pool has active generators, false otherwise
   */
  private hasActiveGenerators(): boolean {
    return this.generators.size > 0;
  }
}