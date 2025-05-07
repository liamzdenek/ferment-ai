import { TaskPoolYield, isTaskPoolYield, executeTaskTree } from './TaskPool.js';

// Define test types that match the provided example
type TaskCallResult = { type: 'result', value: any };
type TaskCallError = { type: 'error', message: string, error?: Error };
type WorkflowLogEvent = { type: string, taskId: string, [key: string]: any };

describe('Task Execution', () => {
  // Helper for delaying execution to test parallelism
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Mock functions for testing
  const mockGetTaskCompleteEvent = (ctx: any, result: TaskCallResult): WorkflowLogEvent => ({
    type: 'taskComplete',
    taskId: ctx.taskId,
    result: result.value
  });
  
  const mockGetTaskErrorEvent = (ctx: any, error: TaskCallError): WorkflowLogEvent => ({
    type: 'taskError',
    taskId: ctx.taskId,
    error: error.message
  });

  // Create a test generator
  async function* createTestGenerator(
    yieldValues: string[],
    returnValue: TaskCallResult | TaskCallError,
    delayMs = 0,
    throwAtIndex = -1
  ): AsyncGenerator<string, TaskCallResult | TaskCallError, string> {
    for (let i = 0; i < yieldValues.length; i++) {
      if (delayMs > 0) await delay(delayMs);
      if (i === throwAtIndex) throw new Error('Generator error');
      const nextValue = yield yieldValues[i];
    }
    return returnValue;
  }

  test('should handle empty generators list', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      return value;
    });
    
    const iterator = executeTaskTree([], nextValueCallback, onResultCallback);
    const result = await iterator.next();
    
    expect(result.done).toBe(true);
    expect(result.value).toEqual([]);
    expect(nextValueCallback).not.toHaveBeenCalled();
    expect(onResultCallback).not.toHaveBeenCalled();
  });

  test('should process a single generator', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      yield { type: 'yield', value: mockGetTaskCompleteEvent({ taskId: id }, value as TaskCallResult) };
      return value;
    });
    
    const generator = createTestGenerator(
      ['value1', 'value2'],
      { type: 'result', value: 'success' }
    );
    
    const values = [];
    for await (const value of executeTaskTree([generator], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    expect(nextValueCallback).toHaveBeenCalledTimes(2);
    expect(nextValueCallback).toHaveBeenCalledWith(0, 'value1');
    expect(nextValueCallback).toHaveBeenCalledWith(0, 'value2');
    expect(onResultCallback).toHaveBeenCalledTimes(1);
    expect(values.length).toBe(2); // One yield from onResultCallback, one final return
  });

  test('should process multiple generators in parallel', async () => {
    const processed: Array<{ id: string | number, value: string}> = [];
    
    const nextValueCallback = jest.fn(async function* (id, value) {
      processed.push({ id, value });
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      return value;
    });
    
    // Create generators with different delays to ensure proper parallelism
    const generator1 = createTestGenerator(
      ['g1-value1', 'g1-value2'],
      { type: 'result', value: 'g1-final' },
      50 // Slower generator
    );
    
    const generator2 = createTestGenerator(
      ['g2-value1', 'g2-value2'],
      { type: 'result', value: 'g2-final' },
      10 // Faster generator
    );
    
    const values = [];
    for await (const value of executeTaskTree([generator1, generator2], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    // Fast generator should process first due to shorter delays
    expect(processed[0]).toEqual({ id: 1, value: 'g2-value1' });
    expect(processed[1]).toEqual({ id: 1, value: 'g2-value2' });
    expect(processed[2]).toEqual({ id: 0, value: 'g1-value1' });
    expect(processed[3]).toEqual({ id: 0, value: 'g1-value2' });
    
    expect(nextValueCallback).toHaveBeenCalledTimes(4);
    expect(onResultCallback).toHaveBeenCalledTimes(2);
  });

  test('should handle generator errors', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      return value;
    });
    
    const generator = createTestGenerator(
      ['value1', 'value2'],
      { type: 'result', value: 'success' },
      0, // No delay
      1  // Throw at index 1
    );
    
    await expect(async () => {
      for await (const value of executeTaskTree([generator], nextValueCallback, onResultCallback)) {
        // Should throw before completing
      }
    }).rejects.toThrow('Generator error');
    
    expect(nextValueCallback).toHaveBeenCalledTimes(1); // Only first value processed
  });

  test('should propagate callback errors back to generators', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      if (value === 'trigger-error') {
        throw new Error('Callback error');
      }
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value: TaskCallResult | TaskCallError) {
      if(value.type === 'error') {
        yield {
          type: 'yield',
          value: mockGetTaskErrorEvent({ taskId: id }, value as TaskCallError)
        };
      }
      return value;
    });
    
    // Create a generator that will handle the error
    async function* errorHandlingGenerator(): AsyncGenerator<string, TaskCallResult | TaskCallError, string> {
      try {
        yield 'normal-value';
        yield 'trigger-error'; // Will cause callback to throw
      } catch (error) {
        return {
          type: 'error',
          message: (error as any).message,
          error: (error as any)
        };
      }
      throw new Error("This is not the throw we expected to happen, expected to throw on trigger-error");
    }
    
    const values = [];
    for await (const value of executeTaskTree([errorHandlingGenerator()], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    expect(nextValueCallback).toHaveBeenCalledTimes(2);
    expect(onResultCallback).toHaveBeenCalledTimes(1);
    expect(onResultCallback).toHaveBeenCalledWith(0, {
      type: 'error', 
      message: 'Callback error',
      error: expect.any(Error)
    });
    
    // Should have an error event from onResultCallback
    expect(values.some(v => 
      v.type === 'yield' && 
      v.value.type === 'taskError'
    )).toBe(true);
  });

  test('should handle TaskPoolYield objects directly', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      return value;
    });
    
    // Create a generator that yields a direct TaskPoolYield
    async function* directYieldGenerator(): AsyncGenerator<string | TaskPoolYield<string>, TaskCallResult, string> {
      yield 'normal-value';
      yield { type: 'yield', value: 'direct-yield' };
      return { type: 'result', value: 'success' };
    }
    
    const values = [];
    for await (const value of executeTaskTree([directYieldGenerator() as any], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    // Check that direct yield was passed through
    expect(values).toContainEqual({ type: 'yield', value: 'direct-yield' });
    
    // nextValueCallback should only be called for normal values
    expect(nextValueCallback).toHaveBeenCalledTimes(1);
    expect(nextValueCallback).toHaveBeenCalledWith(0, 'normal-value');
  });

  test('should process values from callback generators', async () => {
    const nextValueCallback = jest.fn(async function* (id, value) {
      yield { type: 'yield', value: `processing-${value}` };
      yield { type: 'yield', value: `still-processing-${value}` };
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, value) {
      return value;
    });
    
    const generator = createTestGenerator(
      ['test-value'],
      { type: 'result', value: 'success' }
    );
    
    const values = [];
    for await (const value of executeTaskTree([generator], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    // Should have two yields from nextValueCallback
    expect(values).toContainEqual({ type: 'yield', value: 'processing-test-value' });
    expect(values).toContainEqual({ type: 'yield', value: 'still-processing-test-value' });
    
    expect(nextValueCallback).toHaveBeenCalledTimes(1);
  });

  test('should yield values using the actual onResultCallback pattern', async () => {
    // Setup with the sample onResultCallback pattern
    // Create a taskContext map to simulate the tctxs object from the example
    const tctxs = {
      0: { taskId: 'task-0' }
    };
    
    const nextValueCallback = jest.fn(async function* (id, value) {
      return `processed-${value}`;
    });
    
    const onResultCallback = jest.fn(async function* (id, v: TaskCallResult | TaskCallError) {
      if(v.type === 'result') {
        yield {
          type: "yield",
          value: mockGetTaskCompleteEvent({ taskId: `task-${id}` }, v)
        };
      } else if(v.type === 'error') {
        yield {
          type: "yield",
          value: mockGetTaskErrorEvent({ taskId: `task-${id}` }, v)
        };
      } else {
        throw new Error("Unknown how to handle result type: " + (v as any).type);
      }
      return v;
    });
    
    // Test successful result
    const successGenerator = createTestGenerator(
      ['success-value'],
      { type: 'result', value: 'completed' }
    );
    
    const values = [];
    for await (const value of executeTaskTree([successGenerator], nextValueCallback, onResultCallback)) {
      values.push(value);
    }
    
    // Should have the task complete event
    expect(values.some(v => 
      v.type === 'yield' && 
      v.value.type === 'taskComplete' &&
      v.value.taskId === 'task-0' &&
      v.value.result === 'completed'
    )).toBe(true);
  });

  describe('isTaskPoolYield', () => {
    test('should identify valid TaskPoolYield objects', () => {
      expect(isTaskPoolYield({ type: 'yield', value: 'test' })).toBe(true);
    });
    
    test('should reject non-TaskPoolYield objects', () => {
      expect(isTaskPoolYield(null)).toBe(false);
      expect(isTaskPoolYield(undefined)).toBe(false);
      expect(isTaskPoolYield('string')).toBe(false);
      expect(isTaskPoolYield({ type: 'not-yield', value: 'test' })).toBe(false);
      expect(isTaskPoolYield({ value: 'missing-type' })).toBe(false);
    });
  });
});