/**
 * Combines multiple async generators to run them in parallel, yielding values as they become available.
 *
 * This function is particularly useful for executing multiple asynchronous tasks concurrently
 * while still maintaining the benefits of the generator pattern. It's designed to be used in
 * workflow execution systems where multiple tasks need to run in parallel and their outputs
 * need to be processed as they become available.
 *
 * Key features:
 * - Runs all generators in parallel
 * - Yields values from any generator as soon as they're available
 * - Properly handles errors by capturing them in the results array
 * - Returns a tuple of all generators' final results (or errors) in the same order as the input generators
 *
 * Usage example:
 * ```typescript
 * // Create some async generators
 * async function* gen1() {
 *   yield 'A';
 *   yield 'B';
 *   return 'gen1-result';
 * }
 *
 * async function* gen2() {
 *   yield 1;
 *   yield 2;
 *   return 'gen2-result';
 * }
 *
 * // Combine them
 * const combined = combineGenerators([gen1(), gen2()]);
 *
 * // Use the combined generator
 * for await (const value of combined) {
 *   console.log(value); // Outputs values from both generators as they become available
 * }
 *
 * // Get the final results
 * const results = await combined.next();
 * console.log(results.value); // ['gen1-result', 'gen2-result']
 * ```
 *
 * Error handling:
 * If a generator throws an error, the error will be captured and stored in the results array
 * at the same index as the generator that threw it. The combined generator will continue
 * processing other generators.
 *
 * @param generators An array of async generators to combine
 * @returns A new async generator that yields values from all input generators and returns a tuple of their final results or errors
 */
export async function* combineGenerators<
  Generators extends AsyncGenerator<any, any, any>[]
>(generators: [...Generators]): AsyncGenerator<
  Awaited<ReturnType<Generators[number]['next']>>['value'],
  { [K in keyof Generators]: Generators[K] extends AsyncGenerator<any, infer R, any> ? R | Error : never },
  any
> {
  // Special case: If there are no generators, return an empty array immediately
  if (generators.length === 0) {
    return [] as any;
  }

  // Array to store the final return values or errors from each generator
  // This preserves the original order of generators in the results
  const results: any[] = new Array(generators.length).fill(undefined);
  
  // Map to track the original index of each generator
  // This allows us to store results in the correct position even if generators complete out of order
  const indexMap = new Map(generators.map((gen, i) => [gen, i]));
  
  // Create a map of promises for each active generator
  // Using a Map allows us to easily track which promise corresponds to which generator
  const promiseMap = new Map<AsyncGenerator<any, any, any>, Promise<{
    gen: AsyncGenerator<any, any, any>;
    result?: IteratorResult<any, any>;
    error?: Error;
  }>>();
  
  // Initialize promises for all generators
  // Each promise represents the next value from its generator
  for (const gen of generators) {
    promiseMap.set(gen, gen.next()
      .then(result => ({ gen, result, error: undefined }))
      .catch(error => {
        // If the error is not an instance of Error, wrap it for consistency
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        return { gen, error: wrappedError, result: undefined };
      })
    );
  }
  
  // Continue processing as long as there are active generators
  while (promiseMap.size > 0) {
    try {
      // Get all active promises
      const promises = Array.from(promiseMap.values());
      
      // Wait for the first generator to yield, return, or throw
      // This is the key to processing values as soon as they're available
      const { gen, result, error } = await Promise.race(promises);
      
      // Remove the current promise from the map since we've processed it
      promiseMap.delete(gen);
      
      // Get the original index of this generator to maintain order in results
      const originalIndex = indexMap.get(gen);
      
      // Handle errors from generators
      if (error) {
        // Store the error in the results array at the generator's original index
        if (originalIndex !== undefined) {
          results[originalIndex] = error;
        }
        // Don't add a new promise for this generator - it's done due to error
      }
      // Handle completed generators
      else if (result && result.done) {
        // Store the return value in the results array
        if (originalIndex !== undefined) {
          results[originalIndex] = result.value;
        }
        // Don't add a new promise for this generator since it's done
      }
      // Handle generators that yielded a value
      else if (result) {
        // Yield the value from our combined generator
        yield result.value;
        
        // Create a new promise for the next value from this generator
        // This is crucial - it ensures we continue getting values from this generator
        promiseMap.set(gen, gen.next()
          .then(result => ({ gen, result, error: undefined }))
          .catch(error => {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            return { gen, error: wrappedError, result: undefined };
          })
        );
      }
    } catch (error) {
      // This should rarely happen since we're catching errors for each generator individually,
      // but just in case there's an unexpected error in the Promise.race itself
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      throw wrappedError;
    }
  }
  
  // Return all results as a tuple
  return results as { [K in keyof Generators]: Generators[K] extends AsyncGenerator<any, infer R, any> ? R : never };
}