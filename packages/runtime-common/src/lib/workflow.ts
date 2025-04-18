import { z } from 'zod';
import { Construct } from 'constructs';

/**
 * Task definition interface with input and output types
 */
export interface TaskDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  taskDefId: string; // distinct from taskId because this is global
  inputType: I;
  outputType: O;
}

/**
 * Schema for a task
 */
export const TaskDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the task'),
  name: z.string().describe('The name of the task'),
  description: z.string().optional().describe('A description of what the task does'),
  taskDefId: z.string().describe('The global task definition ID'),
  inputType: z.any().describe('The Zod schema for input validation'),
  outputType: z.any().describe('The Zod schema for output validation'),
  nextTasks: z.array(z.string()).describe('The Node Paths of tasks that can be called by this task'),
  tools: z.array(z.string()).describe('The Node Paths of tasks that can be called and returned to by this task')
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Schema for a workflow definition
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the workflow'),
  name: z.string().describe('The name of the workflow'),
  description: z.string().optional().describe('A description of what the workflow does'),
  tasks: z.record(z.string(), TaskDefinitionSchema).describe('A map of Node IDs to task definitions'),
  entryPoints: z.record(z.string(), z.string()).describe('A map of entry point names to Node IDs')
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/**
 * Task context provided to a task during execution
 */
export interface TaskCtx<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  taskDefId: string;
  nodePath: string;
  input: z.infer<I>;
  output: z.infer<O>;
  canCall: { [nodePath: string]: TaskDef<z.ZodTypeAny, z.ZodTypeAny> };
  canUseTools: { [nodePath: string]: TaskDef<z.ZodTypeAny, z.ZodTypeAny> };
  nodePathToConstruct: { [nodePath: string]: Construct };
}

/**
 * Task call and return request
 */
export interface TaskCallAndReturnRequest {
  type: 'callAndReturn';
  taskDefId: string;
  nodePath: string;
  input: any;
}

/**
 * Task call request
 */
export interface TaskCallRequest {
  type: 'call';
  taskDefId: string;
  nodePath: string;
  input: any;
}

/**
 * Task call result
 */
export interface TaskCallResult {
  type: 'result';
  taskDefId: string;
  nodePath: string;
  input: any;
  output: any;
}

export interface TaskCallError {
  type: 'error';
  taskDefId: string;
  nodePath: string;
  input: any;
  error: {
    message: string;
    details: Error | any;
  };
}

/**
 * Task message type union
 */
export type TaskMessage = TaskCallAndReturnRequest | TaskCallRequest | TaskCallResult;

/**
 * Task execution function types
 */
export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallAndReturnRequest, TaskCallRequest | TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>;

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

/**
 * A workflow execution log event
 */
export interface WorkflowLogEvent {
  timestamp: number;
  type: 'task_start' | 'task_complete' | 'task_error' | 'workflow_start' | 'workflow_complete' | 'workflow_error';
  nodePath?: string;
  taskDefId?: string;
  input?: any;
  output?: any;
  error?: Error;
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecutionOptions {
  entryPoint: string;
  input?: any;
}

/**
 * A workflow executor function
 */
export type WorkflowExecutor = (options: WorkflowExecutionOptions) => AsyncIterable<WorkflowLogEvent>;

/**
 * Reconciler callbacks for workflow execution
 */
export interface ReconcilerCallbacks {
  getState: (key: string) => Promise<any>;
  setState: (key: string, value: any) => Promise<void>;
  onTaskStart: (nodePath: string, input: any) => Promise<void>;
  onTaskComplete: (nodePath: string, output: any) => Promise<void>;
  onTaskError: (nodePath: string, error: Error) => Promise<void>;
  onWorkflowStart: () => Promise<void>;
  onWorkflowComplete: () => Promise<void>;
  onWorkflowError: (error: Error) => Promise<void>;
}

/**
 * Interface for task execution state
 */
interface TaskExecutionState {
  nodePath: string;
  input: any;
  generator?: AsyncGenerator<any, any, any>;
  returnTo?: {
    nodePath: string;
    generator: AsyncGenerator<any, any, any>;
    context: any;
  };
  result?: TaskCallResult | TaskCallError; // New field to store the task result
}

/**
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
function isAsyncGeneratorFunction(fn: TaskExecuteFunction<z.ZodTypeAny, z.ZodTypeAny>): boolean {
  //console.log('fn string', fn.toString());
  return fn.toString().includes('function*') || fn.toString().includes('async function*');
}

/**
 * Helper function to validate input against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @param input The input to validate
 * @param nodePath The node path of the task for error reporting
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
 * Result of executing a task as a generator
 */
type TaskGeneratorResult = {
  events: WorkflowLogEvent[];
  nextTask?: TaskExecutionState;
  result?: TaskCallResult | TaskCallError; // Field to store the task result or request
};

/**
 * Execute a task as an async generator
 * 
 * @param taskState The task execution state
 * @param taskImpl The task implementation
 * @param taskDef The task definition
 * @param workflowDef The workflow definition
 * @returns The result of executing the task
 */
async function executeTaskAsGenerator(
  taskState: TaskExecutionState,
  taskImpl: TaskImpl<z.ZodTypeAny, z.ZodTypeAny>,
  taskDef: TaskDefinition,
  workflowDef: WorkflowDefinition
): Promise<TaskGeneratorResult> {
  const { nodePath, input, generator, returnTo } = taskState;
  const events: WorkflowLogEvent[] = [];

  /*
  console.log("executeTaskAsGenerator:", {
    nodePath,
    hasInput: !!input,
    hasGenerator: !!generator,
    hasReturnTo: !!returnTo,
    returnToNodePath: returnTo?.nodePath
  });
  */

  try {
    if (!generator) {
      throw new Error('Generator is undefined');
    }

    //console.log(`Resuming generator for task ${nodePath} with input:`, input);
    const { value, done } = await generator.next(input);
    //console.log(`Generator for task ${nodePath} yielded:`, { value, done });

    if (done) {
      // Generator has completed

      // Validate output using Zod
      const outputType = taskDef.outputType;
      let validatedOutput;

      if (value && value.type === 'result') {
        // Validate the output using Zod
        
        // Use the current task's output type for validation, not the one from the result
        // This ensures we're using the correct schema for the current task
        validatedOutput = validateWithZod(outputType, value.output, nodePath, 'output');

        //console.log(`Task ${nodePath} completed with output:`, validatedOutput);

        // Use the original TaskCallResult but with validated output
        const taskResult: TaskCallResult = {
          ...value as TaskCallResult,
          output: validatedOutput // Replace with validated output
        };

        // Complete the task (for logging/events)
        events.push({
          timestamp: Date.now(),
          type: 'task_complete',
          taskDefId: taskDef.taskDefId,
          nodePath,
          output: validatedOutput
        });

        //console.log(`Task ${nodePath} complete event added, returning events`);
        // No next task, just return the events and the original result
        return { events, result: taskResult };
      } else if (value && (value.type as string) === 'call') {
        // Handle direct call (canCall)
        const { taskDefId, nodePath: nextNodePath, input: nextInput } = value;

        if (workflowDef.tasks[nextNodePath]) {
          // Return the next task to execute
          // Note: We don't preserve the request as a result because it's not a result
          // that will be passed back to a caller
          return {
            events,
            nextTask: {
              nodePath: nextNodePath,
              input: nextInput
            }
            // No result field here because a request is not a result
          };
        } else {
          throw new Error(`Unknown node path for call: ${nextNodePath}`);
        }
      }

      // Default case, just return the events
      // No result field here because we don't have a result to preserve
      return { events };
    } else {
      // Generator has yielded a value
      if (value && value.type === 'callAndReturn') {
        // Handle call and return (canUseTools)
        const { taskDefId, nodePath: nextNodePath, input: toolInput } = value;

        //console.log(`Task ${nodePath} is calling tool ${nodePath} with input:`, toolInput);

        if (workflowDef.tasks[nextNodePath]) {
          //console.log(`Setting up returnTo for tool ${nodePath} to return to ${nodePath}`);
          // Return the tool task to execute
          return {
            events,
            nextTask: {
              nodePath: nextNodePath,
              input: toolInput,
              returnTo: {
                nodePath,
                generator,
                context: {}
              }
            }
            // No result field here because we're not completing a task,
            // we're suspending it to call another task
          };
        } else {
          throw new Error(`Unknown node path for callAndReturn: ${nodePath} (Did you forget to add it to getTools()?)`);
        }
      }

      // Default case, just return the events
      // No result field here because we're not completing a task with a result
      return { events };
    }
  } catch (error) {
    // Check if the error is already a TaskCallError
    let taskError: TaskCallError;
    
    if (error && typeof error === 'object' && (error as any).type === 'error') {
      // Use the existing TaskCallError
      taskError = error as TaskCallError;
    } else {
      // Create a new TaskCallError
      taskError = {
        type: 'error',
        taskDefId: taskDef.taskDefId,
        nodePath,
        input: taskState.input,
        error: {
          message: (error as Error).message || 'Unknown error',
          details: error
        }
      };
    }

    // Handle task error (for logging/events)
    events.push({
      timestamp: Date.now(),
      type: 'task_error',
      nodePath,
      error: error as Error
    });

    // Return the events and the error
    return { events, result: taskError };
  }
}

/**
 * Compiles a workflow definition into an executor function
 *
 * @param workflowDef The workflow definition to compile
 * @param taskImpls A map of node paths to task implementations
 * @returns A workflow executor function
 */
export function compileWorkflow(
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct } = {}
): WorkflowExecutor {
  // Validate the workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);

  //console.log('Compiling workflow with tasks:', Object.keys(workflowDef.tasks));
  //console.log('Available task implementations:', Object.keys(taskImpls));

  // Validate that all tasks have corresponding task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    //console.log(`Checking task implementation for task path: ${taskPath}`);
    if (!taskImpls[taskPath]) {
      //console.log(`Task implementation not found for task path: ${taskPath}`);
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }
  }

  // Return the workflow executor function
  return async function* (options: WorkflowExecutionOptions): AsyncIterable<WorkflowLogEvent> {
    // Create a logger for execution

    //console.log("=== WORKFLOW EXECUTION START ===");
    //console.log("Workflow:", workflowDef.id);
    //console.log("Entry point:", options.entryPoint);

    // Validate the entry point
    const entryPointNodePath = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointNodePath) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }

    // Start the workflow
    const startEvent = {
      timestamp: Date.now(),
      type: 'workflow_start' as const
    };

    // Yield the event
    yield startEvent;

    // Create a stack for task execution
    const taskStack: TaskExecutionState[] = [
      { nodePath: entryPointNodePath, input: options.input }
    ];

    try {

      //console.log("Initial task stack:", JSON.stringify(taskStack, null, 2));
      // Remove stack overflow check to allow proper nesting of tasks

      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        //console.log("Current stack size:", taskStack.length, "Current task:", taskStack[taskStack.length - 1].nodePath);
        const currentTask = taskStack[taskStack.length - 1];
        const { nodePath, generator } = currentTask;

        if (!generator) {
          // This is a new task execution, start it

          // Get the task implementation and definition
          const currentTaskImpl = taskImpls[nodePath];
          const currentTaskDef = workflowDef.tasks[nodePath];

          // Validate input using Zod
          //console.log("Got task definition", currentTaskDef);
          const inputType = currentTaskDef.inputType;
          const validatedInput = validateWithZod(inputType, currentTask.input, nodePath, 'input');

          // Create task start event
          const taskStartEvent = {
            timestamp: Date.now(),
            type: 'task_start' as const,
            nodePath,
            taskDefId: currentTaskDef.taskDefId,
            input: validatedInput
          };

          // Yield the event
          yield taskStartEvent;

          // Create task context
          const taskCtx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny> = {
            taskDefId: currentTaskImpl.def.taskDefId,
            nodePath,
            input: validatedInput,
            output: undefined,
            canCall: {},
            canUseTools: {},
            nodePathToConstruct,
          };

          // Populate canCall and canUseTools maps based on the task's relationships
          // Get the task definition from the workflow
          const taskDef = workflowDef.tasks[nodePath];

          // Get the next tasks that this task can call (canCall)
          for (const nextNodePath of taskDef.nextTasks) {
            if (taskImpls[nextNodePath]) {
              taskCtx.canCall[nextNodePath] = taskImpls[nextNodePath].def;
            }
          }

          // Get the tools that this task can call and return to (canUseTools)
          for (const toolNodePath of taskDef.tools) {
            if (taskImpls[toolNodePath]) {
              taskCtx.canUseTools[toolNodePath] = taskImpls[toolNodePath].def;
            }
          }

          // Check if the execute function is an async generator function
          const executeFunction = currentTaskImpl.execute;

          if (!isAsyncGeneratorFunction(executeFunction)) {
            throw new Error("Unexpected non-generator function in stack?");
          }

          // Execute the task as an async generator
          currentTask.generator = executeFunction(taskCtx) as AsyncGenerator<any, any, any>;

          // Process the generator in the next iteration
          continue;
        } else {
          // Continue execution of an existing generator
          // Get the task implementation and definition for the current task
          const currentTaskImpl = taskImpls[nodePath];
          const currentTaskDef = workflowDef.tasks[nodePath];

          const result = await executeTaskAsGenerator(
            currentTask,
            currentTaskImpl,
            currentTaskDef,
            workflowDef
          );

          // Yield and log any events from the generator
          for (const event of result.events) {
            // Yield the event
            yield event;
          }

          // If the generator returned a next task
          if (result.nextTask) {
            // Remove the current task from the stack
            taskStack.pop();

            // Add the next task to the stack
            taskStack.push(result.nextTask);
          } else {
            // Remove the current task from the stack
            taskStack.pop();

            // If this task was called by another task, return to the caller
            if (currentTask.returnTo) {
              //console.log("Returning to caller task:", currentTask.returnTo.nodePath);

              // Use the preserved TaskCallResult or TaskCallError
              if (!result.result) {
                throw new Error(`Task result not preserved for task ${currentTask.nodePath}. This is a bug in the workflow compiler.`);
              }
              
              // Push the caller task back onto the stack with the preserved result
              taskStack.push({
                nodePath: currentTask.returnTo.nodePath,
                input: result.result, // Pass the full TaskCallResult or TaskCallError object
                generator: currentTask.returnTo.generator
              });
            }
          }
        }
      }

      // Complete the workflow when the stack is empty
      //console.log("=== WORKFLOW EXECUTION COMPLETE ===");
      //console.log("Task stack is empty, completing workflow");

      // Create workflow complete event
      const completeEvent = {
        timestamp: Date.now(),
        type: 'workflow_complete' as const
      };

      // Yield the event
      yield completeEvent;
    } catch (error) {
      // Handle workflow error
      console.log("=== WORKFLOW EXECUTION ERROR ===");
      console.error("Workflow error:", error);
      console.error("Workflow stack:", taskStack)

      // Create workflow error event
      const errorEvent = {
        timestamp: Date.now(),
        type: 'workflow_error' as const,
        error: error as Error
      };
      // Yield the event
      yield errorEvent;
    }
  };
}