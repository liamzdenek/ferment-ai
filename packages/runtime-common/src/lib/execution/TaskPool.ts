import { generateTaskExecutionId } from "./TaskMessaging.js";

/**
 * Type for the callback function that processes a yielded value and returns the next input
 * This callback can also yield values that will be passed through
 */
export type NextValueCallback<YieldT, NextT, YieldOutT> =
  (generatorId: string, value: YieldT) => AsyncGenerator<YieldOutT, NextT, unknown>;

export interface TaskPoolYield<T> {
  type: 'yield',
  value: T
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
export class TaskPool<
  G extends AsyncGenerator<YieldT, ReturnT, NextT>,
  YieldT = any,
  ReturnT = any,
  NextT = any,
  YieldOutT = any
> {
  private generators: Map<string, G> = new Map();
  private nextValueCallback: NextValueCallback<YieldT, NextT, YieldOutT>;
  
  /**
   * Create a new TaskPool
   * @param nextValueCallback A callback function that processes yielded values and returns the next input
   */
  constructor(nextValueCallback: NextValueCallback<YieldT, NextT, YieldOutT>) {
    this.nextValueCallback = nextValueCallback;
  }
  
  /**
   * Add a generator to the pool
   * @param generator The generator to add
   * @returns The ID of the generator in the pool
   */
  push(generator: G): string {
    const id = generateTaskExecutionId();
    this.generators.set(id, generator);
    return id;
  }
  
  /**
   * Process all generators in the pool and yield values from the callback
   * This is an async generator that yields values from the callback
   */
  async *next(): AsyncGenerator<YieldOutT, void, unknown> {
    // Create a map of promises for each generator
    type PromiseResult = {
      id: string;
      result: IteratorResult<YieldT, ReturnT>;
    };
    
    const generatorPromises = new Map<string, Promise<PromiseResult>>();
    
    // Start all generators
    for (const [id, generator] of this.generators.entries()) {
      // Create a promise for the first value from this generator
      const promise = generator.next().then(result => ({
        id,
        result
      }));
      
      generatorPromises.set(id, promise);
    }
    
    // Process generators until they're all done
    while (generatorPromises.size > 0) {
      // Wait for any generator to produce a value
      const { id, result } = await Promise.race(generatorPromises.values());
      
      // Remove this promise from the map
      generatorPromises.delete(id);
      
      // If the generator is done, remove it from the pool
      if (result.done) {
        this.generators.delete(id);
        continue;
      }
      
      // Call the callback with the yielded value
      const callbackGenerator = this.nextValueCallback(id, result.value);
      
      // Yield all values from the callback
      for await (const yieldedValue of callbackGenerator) {
        yield yieldedValue;
      }
      
      // Get the final result from the callback
      const callbackResult = await callbackGenerator.next();
      
      // If the callback is done, use its return value as the next input for the generator
      if (callbackResult.done && this.generators.has(id)) {
        // Create a new promise for the next value from this generator
        const nextPromise = this.generators.get(id)!.next(callbackResult.value).then(result => ({
          id,
          result
        }));
        
        // Add the promise back to the map
        generatorPromises.set(id, nextPromise);
      }
    }
  }
  
  /**
   * Check if the pool has any active generators
   * @returns True if the pool has active generators, false otherwise
   */
  hasActiveGenerators(): boolean {
    return this.generators.size > 0;
  }
  
  /**
   * Get the number of active generators in the pool
   * @returns The number of active generators
   */
  getActiveGeneratorCount(): number {
    return this.generators.size;
  }
}