import { z } from 'zod';
import { Construct } from 'constructs';
import { WorkflowDefinition, WorkflowDefinitionSchema } from '../definitions/WorkflowDefinition.js';
import { TaskImplMap, TaskExecutionState, TaskStepResult } from './TaskExecution.js';
import { TaskCallError, TaskCallResult, WorkflowLogEvent, WorkflowExecutionOptions, TaskCallParallelRequest } from './TaskMessaging.js';
import { WorkflowError } from './ErrorHandling.js';

/**
 * A workflow executor function
 */
export type WorkflowExecutor = (options: WorkflowExecutionOptions) => AsyncIterable<WorkflowLogEvent>;

/**
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
function isAsyncGeneratorFunction(fn: any): boolean {
  return fn.toString().includes('function*') || fn.toString().includes('async function*');
}

/**
 * Helper function to validate input against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @param input The input to validate
 * @param nodePath The node path of the task for error reporting
 * @param direction Whether this is input or output validation
 * @returns The validated input
 */
function validateWithZod<T>(schema: z.ZodType<T>, input: any, nodePath: string, direction: 'input' | 'output'): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid ${direction} for task ${nodePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a task context for execution
 * 
 * @param taskState The task execution state
 * @param taskImpl The task implementation
 * @param workflowDef The workflow definition
 * @param taskImpls Map of task implementations
 * @param nodePathToConstruct Map of node paths to constructs
 * @returns The task context
 */
function createTaskContext(
  taskState: TaskExecutionState,
  taskImpl: any,
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct }
): any {
  const { nodePath, input } = taskState;
  const taskDef = workflowDef.tasks[nodePath];

  // Create the base task context
  const taskCtx: any = {
    taskDefId: taskImpl.def.taskDefId,
    nodePath,
    input,
    output: undefined,
    canCallTasks: {},
    nodePathToConstruct,
  };
  // populate canCallTasks map
  for (const toolNodePath of taskDef.reachableTasks) {
    if (taskImpls[toolNodePath]) {
      taskCtx.canCallTasks[toolNodePath] = taskImpls[toolNodePath].def;
    }
  }

  return taskCtx;
}

/**
 * Execute a single step of a task
 * 
 * @param taskState The task execution state
 * @param taskImpl The task implementation
 * @param workflowDef The workflow definition
 * @param taskImpls Map of task implementations
 * @param nodePathToConstruct Map of node paths to constructs
 * @returns The result of the task step
 */
async function executeTaskStep(
  taskState: TaskExecutionState,
  taskImpl: any,
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct }
): Promise<TaskStepResult> {
  const { nodePath, input, generator } = taskState;

  try {
    // Initialize generator if needed
    if (!generator) {
      // Create task context
      const taskCtx = createTaskContext(taskState, taskImpl, workflowDef, taskImpls, nodePathToConstruct);

      // Initialize generator
      const newGenerator = taskImpl.execute(taskCtx);

      // Return updated state
      return {
        type: 'continue',
        state: { ...taskState, generator: newGenerator }
      };
    }

    // Advance generator
    const { value, done } = await generator.next(input);

    // Handle generator completion
    if (done) {
      // Handle different result types
      if (value && value.type === 'result') {
        // Validate output
        const validatedOutput = validateWithZod(
          taskImpl.def.outputType,
          value.output,
          nodePath,
          'output'
        );

        // Return result
        return {
          type: 'complete',
          result: { ...value, output: validatedOutput } as TaskCallResult
        };
      } else if (value && value.type === 'error') {
        // Handle error result
        return {
          type: 'complete',
          result: value as TaskCallError
        };
      }

      // Default case (should not happen with proper typing)
      throw new Error(`Unexpected result type from task ${nodePath}: ${value?.type}`);
    }

    // Handle generator yield
    if (value && value.type === 'call') {
      // Handle "call" pattern
      return {
        type: 'call',
        nextTask: {
          nodePath: value.nodePath,
          input: value.input
        },
        returnTo: {
          nodePath,
          generator
        }
      };
    } else if (value && value.type === 'callParallel') {
      // Handle "callParallel" pattern
      return {
        type: 'callParallel',
        parallelTasks: value.calls.map((call: { nodePath: string; input: any }) => ({
          nodePath: call.nodePath,
          input: call.input
        })),
        returnTo: {
          nodePath,
          generator
        }
      };
    }

    // Default case (continue)
    return {
      type: 'continue',
      state: taskState
    };
  } catch (error) {
    // Create a WorkflowError if not already one
    const workflowError = error instanceof WorkflowError
      ? error
      : new WorkflowError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error instanceof Error ? error : undefined }
      );

    // Add current task to the call stack
    workflowError.addFrame({
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: taskState.input,
      construct: nodePathToConstruct[nodePath] ? {
        id: nodePathToConstruct[nodePath].node.id,
        path: nodePathToConstruct[nodePath].node.path
      } : undefined
    });

    // Create TaskCallError
    const taskError: TaskCallError = {
      type: 'error',
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: taskState.input,
      error: {
        message: workflowError.message,
        details: workflowError
      }
    };

    return {
      type: 'complete',
      result: taskError
    };
  }
}

/**
 * Push a task onto the stack
 * 
 * @param stack The current task stack
 * @param task The task to push
 * @returns The new task stack
 */
function pushTask(stack: TaskExecutionState[], task: TaskExecutionState): TaskExecutionState[] {
  return [...stack, task];
}

/**
 * Pop a task from the stack
 * 
 * @param stack The current task stack
 * @returns The new task stack and the popped task
 */
function popTask(stack: TaskExecutionState[]): [TaskExecutionState[], TaskExecutionState | undefined] {
  if (stack.length === 0) return [stack, undefined];
  return [stack.slice(0, -1), stack[stack.length - 1]];
}

/**
 * Replace the top task on the stack
 * 
 * @param stack The current task stack
 * @param task The task to replace with
 * @returns The new task stack
 */
function replaceTask(stack: TaskExecutionState[], task: TaskExecutionState): TaskExecutionState[] {
  if (stack.length === 0) return [task];
  return [...stack.slice(0, -1), task];
}

/**
 * Compiles a workflow definition into an executor function
 *
 * @param workflowDef The workflow definition to compile
 * @param taskImpls A map of node paths to task implementations
 * @param nodePathToConstruct A map of node paths to constructs
 * @returns A workflow executor function
 */
export function compileWorkflow(
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct } = {}
): WorkflowExecutor {
  // Validate the workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);

  // Validate that all tasks have corresponding task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    if (!taskImpls[taskPath]) {
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }

    // Verify that the execute function is an async generator
    if (!isAsyncGeneratorFunction(taskImpls[taskPath].execute)) {
      throw new Error(`Task implementation for ${taskPath} must be an async generator function`);
    }
  }

  // Return the workflow executor function
  return async function* (options: WorkflowExecutionOptions): AsyncIterable<WorkflowLogEvent> {
    // Validate the entry point
    const entryPointNodePath = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointNodePath) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }

    // Track started and completed tasks
    const startedTasks = new Set<string>();
    const completedTasks = new Set<string>();

    // Start the workflow
    yield {
      timestamp: Date.now(),
      type: 'workflow_start'
    };

    // Initialize task stack
    let taskStack: TaskExecutionState[] = [
      { nodePath: entryPointNodePath, input: options.input }
    ];

    try {
      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        const currentTask = taskStack[taskStack.length - 1];
        const { nodePath } = currentTask;

        // Get task implementation and definition
        const taskImpl = taskImpls[nodePath];
        const taskDef = workflowDef.tasks[nodePath];

        if (!taskDef) {
          throw new Error("You did not set up getReachableTasks() for a request that you're trying to make. Construct id=" + workflowDef.name + " is trying to call path=" + nodePath + ", which has not been configured at compile time");
        }

        // Start task if not already started
        if (!currentTask.generator && !startedTasks.has(nodePath)) {
          // Validate input
          const validatedInput = validateWithZod(
            taskDef.inputType,
            currentTask.input,
            nodePath,
            'input'
          );

          // Update task input with validated input
          taskStack[taskStack.length - 1] = {
            ...currentTask,
            input: validatedInput
          };

          // Yield task start event
          yield {
            timestamp: Date.now(),
            type: 'task_start',
            nodePath,
            taskDefId: taskDef.taskDefId,
            input: validatedInput
          };

          // Mark task as started
          startedTasks.add(nodePath);
        }

        // Execute task step
        const result = await executeTaskStep(
          currentTask,
          taskImpl,
          workflowDef,
          taskImpls,
          nodePathToConstruct
        );

        // Handle result based on type
        switch (result.type) {
          case 'continue':
            // Update task state
            taskStack = replaceTask(taskStack, result.state);
            break;

          case 'call':
            // Push next task onto stack with return information
            taskStack = pushTask(taskStack, {
              ...result.nextTask,
              returnTo: result.returnTo
            });
            break;
            
          case 'callParallel': {
            // Execute parallel tasks and collect results
            const parallelResults = executeParallelTasks(
              result.parallelTasks,
              result.returnTo.nodePath,
              workflowDef,
              taskImpls,
              nodePathToConstruct
            );
            
            // Yield all events from parallel execution
            let parallelEvent: IteratorResult<WorkflowLogEvent, Array<TaskCallResult | TaskCallError>>;
            do {
              parallelEvent = await parallelResults.next();
              if (!parallelEvent.done) {
                yield parallelEvent.value;
              }
            } while (!parallelEvent.done);
            
            // Push the caller back onto the stack with the collected results
            taskStack = pushTask(taskStack, {
              nodePath: result.returnTo.nodePath,
              input: parallelEvent.value, // This is the array of results
              generator: result.returnTo.generator
            });
            break;
          }

          case 'complete': {
            // Handle task completion
            if (result.result.type === 'result') {
              // Yield task complete event
              yield {
                timestamp: Date.now(),
                type: 'task_complete',
                nodePath,
                taskDefId: taskDef.taskDefId,
                output: result.result.output
              };

              // Mark task as completed
              completedTasks.add(nodePath);
            } else {
              // Extract the error
              const errorDetails = result.result.error.details;
              const errorMessage = result.result.error.message;

              // Mark task as completed even though it errored
              // This prevents the "WORKFLOW BUG" error for tasks that throw exceptions
              completedTasks.add(nodePath);

              const error = errorDetails instanceof WorkflowError
                ? errorDetails
                : new Error(errorMessage);

              // Yield task error event
              yield {
                timestamp: Date.now(),
                type: 'task_error',
                nodePath,
                taskDefId: taskDef.taskDefId,
                error
              };

              if (taskStack.length === 1) {
                // we are at the top of the stack so we should error log it:
                throw error;
              }
            }

            // Pop current task from stack
            const popResult = popTask(taskStack);
            taskStack = popResult[0];

            // Handle return to caller
            if (currentTask.returnTo) {
              // Push caller back onto stack with result
              // But first check if it's already on the stack to avoid duplication
              const callerIndex = taskStack.findIndex(t => t.nodePath === currentTask.returnTo?.nodePath);
              if (callerIndex >= 0) {
                // Caller is already on the stack, update its input
                taskStack[callerIndex] = {
                  ...taskStack[callerIndex],
                  input: result.result
                };
              } else {
                // Caller is not on the stack, push it
                taskStack = pushTask(taskStack, {
                  nodePath: currentTask.returnTo.nodePath,
                  input: result.result,
                  generator: currentTask.returnTo.generator
                });
              }
            }
            break;
          }
        }
      }

      // Check for incomplete tasks
      const incompleteTasks: string[] = [];
      for (const nodePath of startedTasks) {
        if (!completedTasks.has(nodePath)) {
          incompleteTasks.push(nodePath);
        }
      }

      // Throw error if there are incomplete tasks
      if (incompleteTasks.length > 0) {
        throw new Error(
          `WORKFLOW BUG: The following tasks started but didn't complete: ${incompleteTasks.join(', ')}. ` +
          `This is a bug in the workflow execution engine. Check if these tasks are using 'call' correctly.`
        );
      }

      // Complete workflow
      yield {
        timestamp: Date.now(),
        type: 'workflow_complete'
      };
    } catch (error) {
      // Handle workflow error
      console.log("=== WORKFLOW EXECUTION ERROR ===");

      // Create a WorkflowError if not already one
      const workflowError = error instanceof WorkflowError
        ? error
        : new WorkflowError(
          error instanceof Error ? error.message : 'Unknown workflow error',
          { originalError: error instanceof Error ? error : undefined }
        );

      console.error("Workflow error:", workflowError.message);

      console.error("Error call stack:");
      for (const [index, frame] of workflowError.callStack.entries()) {
        console.error(`  ${index}: ${frame.nodePath} (${frame.taskDefId})`);
        if (frame.construct) {
          console.error(`     Construct: ${frame.construct.id} (${frame.construct.path})`);
        }
        console.error(`     Input:`);
        console.error(`       ${JSON.stringify(frame.input, null, 2).replace(/\n/g, '\n       ')}`);
      }

      console.error("Workflow stack:", taskStack.map(t => t.nodePath).join(' -> '));

      yield {
        timestamp: Date.now(),
        type: 'workflow_error',
        error: workflowError
      };
    }
    
    /**
     * Executes multiple tasks in parallel, each with their own execution stack
     * Returns an AsyncGenerator that yields events from all parallel executions
     *
     * @param parallelTasks Array of tasks to execute in parallel
     * @param parentNodePath The node path of the parent task
     * @param workflowDef The workflow definition
     * @param taskImpls Map of task implementations
     * @param nodePathToConstruct Map of node paths to constructs
     * @returns AsyncGenerator yielding events and resolving to results
     */
    async function* executeParallelTasks(
      parallelTasks: TaskExecutionState[],
      parentNodePath: string,
      workflowDef: WorkflowDefinition,
      taskImpls: TaskImplMap,
      nodePathToConstruct: { [nodePath: string]: Construct }
    ): AsyncGenerator<WorkflowLogEvent, Array<TaskCallResult | TaskCallError>, undefined> {
      // Yield parallel execution start event
      yield {
        timestamp: Date.now(),
        type: 'parallel_tasks_start',
        nodePath: parentNodePath,
        input: parallelTasks.map(t => ({ nodePath: t.nodePath, input: t.input }))
      };
    
      // Create a promise for each parallel task
      const taskPromises = parallelTasks.map(async (task) => {
        // Create a new stack for this task
        let taskStack: TaskExecutionState[] = [task];
        const events: WorkflowLogEvent[] = [];
        let finalResult: TaskCallResult | TaskCallError | undefined;
    
        try {
          // Execute this task with its own stack until complete
          while (taskStack.length > 0) {
            const currentTask = taskStack[taskStack.length - 1];
            const { nodePath } = currentTask;
            const taskImpl = taskImpls[nodePath];
            
            if (!taskImpl) {
              throw new Error(`Task implementation not found for task path: ${nodePath}`);
            }
            
            const taskDef = workflowDef.tasks[nodePath];
            
            if (!taskDef) {
              throw new Error(`Task definition not found for task path: ${nodePath}`);
            }
            
            // Start task if not already started
            if (!currentTask.generator) {
              // Validate input
              const validatedInput = validateWithZod(
                taskDef.inputType,
                currentTask.input,
                nodePath,
                'input'
              );
              
              // Update task input with validated input
              taskStack[taskStack.length - 1] = {
                ...currentTask,
                input: validatedInput
              };
              
              // Add task_start event
              events.push({
                timestamp: Date.now(),
                type: 'task_start',
                nodePath,
                taskDefId: taskDef.taskDefId,
                input: validatedInput
              });
            }
            
            // Execute task step
            const result = await executeTaskStep(
              currentTask,
              taskImpl,
              workflowDef,
              taskImpls,
              nodePathToConstruct
            );
            
            // Handle result based on type (simplified version of main loop)
            switch (result.type) {
              case 'continue':
                taskStack = replaceTask(taskStack, result.state);
                break;
                
              case 'call':
                taskStack = pushTask(taskStack, {
                  ...result.nextTask,
                  returnTo: result.returnTo
                });
                break;
                
              case 'callParallel':
                // We don't support nested parallel calls for simplicity
                throw new Error(`Nested parallel calls are not supported: ${nodePath}`);
                
              case 'complete':
                // Add task_complete or task_error event
                if (result.result.type === 'result') {
                  events.push({
                    timestamp: Date.now(),
                    type: 'task_complete',
                    nodePath,
                    taskDefId: taskDef.taskDefId,
                    output: result.result.output
                  });
                } else {
                  events.push({
                    timestamp: Date.now(),
                    type: 'task_error',
                    nodePath,
                    taskDefId: taskDef.taskDefId,
                    error: result.result.error.details instanceof Error
                      ? result.result.error.details
                      : new Error(result.result.error.message)
                  });
                }
                
                // Pop current task
                {
                  const [newStack, _] = popTask(taskStack);
                  taskStack = newStack;
                }
                
                // Handle return to caller
                if (currentTask.returnTo) {
                  taskStack = pushTask(taskStack, {
                    nodePath: currentTask.returnTo.nodePath,
                    input: result.result,
                    generator: currentTask.returnTo.generator
                  });
                } else if (taskStack.length === 0) {
                  // This is the final result
                  finalResult = result.result;
                }
                break;
            }
          }
          
          // If we didn't get a final result, something went wrong
          if (!finalResult) {
            throw new Error(`Task execution completed without a final result: ${task.nodePath}`);
          }
          
          return { result: finalResult, events };
        } catch (error) {
          // Create a consistent error result
          const errorResult: TaskCallError = {
            type: 'error',
            taskDefId: taskImpls[task.nodePath]?.def.taskDefId || 'unknown',
            nodePath: task.nodePath,
            input: task.input,
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error : new Error(String(error))
            }
          };
          
          // Add task_error event
          events.push({
            timestamp: Date.now(),
            type: 'task_error',
            nodePath: task.nodePath,
            taskDefId: taskImpls[task.nodePath]?.def.taskDefId,
            error: error instanceof Error ? error : new Error(String(error))
          });
          
          return { result: errorResult, events };
        }
      });
      
      // Execute all tasks in parallel and collect results
      const taskResults = await Promise.all(taskPromises);
      
      // Collect all events and sort by timestamp
      const allEvents: WorkflowLogEvent[] = [];
      for (const { events } of taskResults) {
        allEvents.push(...events);
      }
      allEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      // Yield all events in order
      for (const event of allEvents) {
        yield event;
      }
      
      // Collect final results
      const results = taskResults.map(r => r.result);
      
      // Yield parallel execution complete event
      yield {
        timestamp: Date.now(),
        type: 'parallel_tasks_complete',
        nodePath: parentNodePath,
        output: results
      };
      
      // Return the final results
      return results;
    }
  };
}