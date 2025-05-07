import { TaskPoolYield, isTaskPoolYield, executeTaskTree } from './TaskPool.js';

describe('Task execution error propagation', () => {
  test('generator can catch errors propagated through recursive callbacks', async () => {
    // Track events for verification
    const events: string[] = [];
    
    // Define our task types
    type TaskRequest = { action: string, tasks?: string[] };
    type TaskResult = { status: 'success' | 'error', message: string };
    
    // Define the processYieldedValue callback that handles recursive task calls
    const processYieldedValue = async function* (
      generatorId: number,
      request: TaskRequest
    ): AsyncGenerator<TaskPoolYield<string>, TaskResult, void> {
      events.push(`processYieldedValue: Generator ${generatorId} requested "${request.action}"`);
      
      // If the request includes subtasks, run them recursively
      if (request.tasks && request.tasks.length > 0) {
        events.push(`Starting subtasks: ${request.tasks.join(', ')}`);
        
        // Create generators for subtasks
        const subtaskGenerators: Array<AsyncGenerator<TaskRequest, TaskResult, TaskResult>> = [];
        
        // Add generators for each subtask
        for (const task of request.tasks) {
          if (task === 'B') {
            subtaskGenerators.push(createTaskB());
          } else if (task === 'C') {
            subtaskGenerators.push(createTaskC());
          }
        }
        
        try {
          // Process all values from the subtasks
          // Pass the current generatorId as the parentId
          for await (const value of executeTaskTree(subtaskGenerators, processYieldedValue, onResultCallback, generatorId)) {
            if (isTaskPoolYield(value)) {
              // Pass up any yielded values
              yield value;
            }
          }
          
          // Successfully ran all subtasks
          events.push(`All subtasks of generator ${generatorId} completed successfully`);
          return { status: 'success', message: 'All subtasks completed' };
        } catch (error) {
          // An error occurred in a subtask
          events.push(`Error in subtasks of generator ${generatorId}: ${(error as Error).message}`);
          throw error; // Re-throw to propagate up
        }
      }
      
      // For non-subtask requests, return a simple result
      return { status: 'success', message: `Processed ${request.action}` };
    };
    
    // Define the onResultCallback
    const onResultCallback = async function* (
      generatorId: number,
      result: TaskResult
    ): AsyncGenerator<TaskPoolYield<string>, TaskResult, void> {
      events.push(`onResultCallback: Generator ${generatorId} completed with status ${result.status}`);
      
      // Yield an event for the task completion
      yield {
        type: 'yield',
        value: `Generator ${generatorId} completed: ${result.message}`
      };
      
      return result;
    };
    
    // Create generator for task C - will throw an error
    async function* createTaskC(): AsyncGenerator<TaskRequest, TaskResult, TaskResult> {
      events.push('Generator C started');
      
      // Simulate some work
      yield { action: 'C doing some work' };
      
      // Throw an error
      events.push('Generator C throwing error');
      throw new Error('Intentional error from Task C');
      
      // This will never execute
      return { status: 'success', message: 'C completed - should never happen' };
    }
    
    // Create generator for task B - will call C and catch its error
    async function* createTaskB(): AsyncGenerator<TaskRequest, TaskResult, TaskResult> {
      events.push('Generator B started');
      
      // Do some initial work
      yield { action: 'B doing initial work' };
      
      try {
        // Request to run task C
        const cResult = yield { action: 'B requesting to run C', tasks: ['C'] };
        
        events.push(`B received unexpected success from C: ${cResult.message}`);
        return { status: 'success', message: 'B completed without catching error - unexpected' };
      } catch (error) {
        // We expect to catch C's error here
        events.push(`Generator B caught error: ${(error as Error).message}`);
        
        // Do some recovery work
        yield { action: 'B recovering from error' };
        
        // Return success despite the error
        return { status: 'success', message: 'B completed successfully despite C error' };
      }
    }
    
    // Create generator for task A - will call B 
    async function* createTaskA(): AsyncGenerator<TaskRequest, TaskResult, TaskResult> {
      events.push('Generator A started');
      
      // Do some initial work
      yield { action: 'A doing initial work' };
      
      // Request to run task B
      const bResult = yield { action: 'A requesting to run B', tasks: ['B'] };
      
      events.push(`A received result from B: ${bResult.message}`);
      
      // Return final result
      return { status: 'success', message: 'A completed successfully' };
    }
    
    // Create the generator for task A
    const generatorA = createTaskA();
    
    // Collect all yielded values using executeTaskTree
    const yielded: string[] = [];
    
    for await (const value of executeTaskTree([generatorA], processYieldedValue, onResultCallback)) {
      if (isTaskPoolYield(value)) {
        yielded.push(value.value);
      }
    }
    
    // Log events for debugging
    console.log("Events", events);
    console.log("Yielded", yielded);
    
    // Verify the execution flow - events that must exist
    expect(events).toContain('Generator A started');
    expect(events).toContain('Generator B started');
    expect(events).toContain('Generator C started');
    expect(events).toContain('Generator C throwing error');
    expect(events).toContain('Generator B caught error: Intentional error from Task C');
    expect(events).toContain('onResultCallback: Generator 0 completed with status success');
    
    // Verify that the yielded values include completion messages
    expect(yielded).toContain('Generator 0 completed: B completed successfully despite C error');
    expect(yielded).toContain('Generator 0 completed: A completed successfully');
    
    // Get index of all key events
    const aStartIndex = events.indexOf('Generator A started');
    const bStartIndex = events.indexOf('Generator B started');
    const cStartIndex = events.indexOf('Generator C started');
    const throwIndex = events.indexOf('Generator C throwing error');
    const errorPropagateIndex = events.indexOf('Error in subtasks of generator 0: Intentional error from Task C');
    const catchIndex = events.indexOf('Generator B caught error: Intentional error from Task C');
    const bRecoveringIndex = events.indexOf('processYieldedValue: Generator 0 requested "B recovering from error"');
    const bCompleteIndex = events.indexOf('onResultCallback: Generator 0 completed with status success');
    const aReceivedResultIndex = events.indexOf('A received result from B: All subtasks completed');
    const aCompleteIndex = events.indexOf('onResultCallback: Generator 0 completed with status success');
    
    // Verify the complete execution order
    // 1. Tasks should start in order A -> B -> C
    expect(aStartIndex).toBeLessThan(bStartIndex);
    expect(bStartIndex).toBeLessThan(cStartIndex);
    
    // 2. Error propagation sequence
    expect(cStartIndex).toBeLessThan(throwIndex);
    expect(throwIndex).toBeLessThan(errorPropagateIndex);
    expect(errorPropagateIndex).toBeLessThan(catchIndex);
    expect(catchIndex).toBeLessThan(bRecoveringIndex);
    
    // 3. Task completion sequence
    expect(bRecoveringIndex).toBeLessThan(bCompleteIndex);
    expect(bCompleteIndex).toBeLessThan(aReceivedResultIndex);
    expect(aReceivedResultIndex).toBeLessThan(aCompleteIndex);
    
    // 4. Comprehensive order check
    [
      aStartIndex, bStartIndex, cStartIndex, throwIndex, 
      errorPropagateIndex, catchIndex, bRecoveringIndex, 
      bCompleteIndex, aReceivedResultIndex, aCompleteIndex
    ].reduce((prev, curr) => {
      expect(prev).toBeLessThan(curr);
      return curr;
    });
  });
});