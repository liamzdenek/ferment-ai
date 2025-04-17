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
  nextTasks: z.array(z.string()).describe('The IDs of tasks that can be called by this task'),
  tools: z.array(z.string()).describe('The IDs of tasks that can be called and returned to by this task')
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Schema for a workflow definition
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the workflow'),
  name: z.string().describe('The name of the workflow'),
  description: z.string().optional().describe('A description of what the workflow does'),
  tasks: z.record(z.string(), TaskDefinitionSchema).describe('A map of task IDs to task definitions'),
  entryPoints: z.record(z.string(), z.string()).describe('A map of entry point names to task IDs')
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

/**
 * Task context provided to a task during execution
 */
export interface TaskCtx<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  taskDefId: string;
  taskId: string;
  input: z.infer<I>;
  output: z.infer<O>;
  canCall: { [taskId: string]: TaskDef<z.ZodTypeAny, z.ZodTypeAny> };
  canCallAndReturn: { [taskId: string]: TaskDef<z.ZodTypeAny, z.ZodTypeAny> };
  taskIdToConstruct: { [taskId: string]: Construct };
}

/**
 * Task call and return request
 */
export interface TaskCallAndReturnRequest {
  type: 'callAndReturn';
  taskDefId: string;
  taskId: string;
  input: any;
}

/**
 * Task call request
 */
export interface TaskCallRequest {
  type: 'call';
  taskDefId: string;
  taskId: string;
  input: any;
}

/**
 * Task call result
 */
export interface TaskCallResult {
  type: 'result';
  taskDefId: string;
  taskId: string;
  input: any;
  output: any;
}

export interface TaskCallError {
  type: 'error';
  taskDefId: string;
  taskId: string;
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
  taskId: string;
  execute: TaskExecuteFunction<I, O>;
}

/**
 * A task function that executes a task
 * 
 * @deprecated Use TaskImpl instead
 */
export type TaskFunction<TInput = any, TOutput = any> = (input: TInput) => Promise<TOutput>;

/**
 * A map of task IDs to task implementations
 */
export type TaskImplMap = Record<string, TaskImpl<any, any>>;

/**
 * A map of task IDs to task functions
 * 
 * @deprecated Use TaskImplMap instead
 */
export type TaskFunctionMap = Record<string, TaskFunction>;

/**
 * A workflow execution log event
 */
export interface WorkflowLogEvent {
  timestamp: number;
  type: 'task_start' | 'task_complete' | 'task_error' | 'workflow_start' | 'workflow_complete' | 'workflow_error';
  taskId?: string;
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
  onTaskStart: (taskId: string, input: any) => Promise<void>;
  onTaskComplete: (taskId: string, output: any) => Promise<void>;
  onTaskError: (taskId: string, error: Error) => Promise<void>;
  onWorkflowStart: () => Promise<void>;
  onWorkflowComplete: () => Promise<void>;
  onWorkflowError: (error: Error) => Promise<void>;
}

/**
 * Interface for task execution state
 */
interface TaskExecutionState {
  taskId: string;
  input: any;
  generator?: AsyncGenerator<any, any, any>;
  returnTo?: {
    taskId: string;
    generator: AsyncGenerator<any, any, any>;
    context: any;
  };
}

/**
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
function isAsyncGeneratorFunction(fn: TaskExecuteFunction<any, any>): boolean {
  return fn.toString().includes('function*') || fn.toString().includes('async function*');
}

/**
 * Helper function to validate input against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @param input The input to validate
 * @param taskId The ID of the task for error reporting
 * @returns The validated input
 */
function validateWithZod<T>(schema: z.ZodType<T>, input: any, taskId: string, direction: 'input' | 'output'): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid ${direction} for task ${taskId}: ${error.message}`);
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
  taskImpl: TaskImpl<any, any>,
  taskDef: TaskDefinition,
  workflowDef: WorkflowDefinition
): Promise<TaskGeneratorResult> {
  const { taskId, input, generator, returnTo } = taskState;
  const events: WorkflowLogEvent[] = [];

  /*
  console.log("executeTaskAsGenerator:", {
    taskId,
    hasInput: !!input,
    hasGenerator: !!generator,
    hasReturnTo: !!returnTo,
    returnToTaskId: returnTo?.taskId
  });
  */

  try {
    if (!generator) {
      throw new Error('Generator is undefined');
    }

    //console.log(`Resuming generator for task ${taskId} with input:`, input);
    const { value, done } = await generator.next(input);
    //console.log(`Generator for task ${taskId} yielded:`, { value, done });

    if (done) {
      // Generator has completed

      // Validate output using Zod
      const outputType = taskDef.outputType;
      let validatedOutput;

      if (value && value.type === 'result') {
        validatedOutput = validateWithZod(outputType, value.output, taskId, 'output');

        //console.log(`Task ${taskId} completed with output:`, validatedOutput);

        // Complete the task
        events.push({
          timestamp: Date.now(),
          type: 'task_complete',
          taskDefId: taskDef.taskDefId,
          taskId,
          output: validatedOutput
        });

        //console.log(`Task ${taskId} complete event added, returning events`);
        // No next task, just return the events
        return { events };
      } else if (value && (value.type as string) === 'call') {
        // Handle direct call (canCall)
        const { taskDefId, taskId: nextTaskId, input: nextInput } = value;

        if (workflowDef.tasks[nextTaskId]) {
          // Return the next task to execute
          return {
            events,
            nextTask: {
              taskId: nextTaskId,
              input: nextInput
            }
          };
        } else {
          throw new Error(`Unknown task ID for call: ${nextTaskId}`);
        }
      }

      // Default case, just return the events
      return { events };
    } else {
      // Generator has yielded a value
      if (value && value.type === 'callAndReturn') {
        // Handle call and return (canCallAndReturn)
        const { taskDefId, taskId: toolId, input: toolInput } = value;

        //console.log(`Task ${taskId} is calling tool ${toolId} with input:`, toolInput);

        if (workflowDef.tasks[toolId]) {
          //console.log(`Setting up returnTo for tool ${toolId} to return to ${taskId}`);
          // Return the tool task to execute
          return {
            events,
            nextTask: {
              taskId: toolId,
              input: toolInput,
              returnTo: {
                taskId,
                generator,
                context: {}
              }
            }
          };
        } else {
          throw new Error(`Unknown tool ID for callAndReturn: ${toolId}`);
        }
      }

      // Default case, just return the events
      return { events };
    }
  } catch (error) {
    // Handle task error
    events.push({
      timestamp: Date.now(),
      type: 'task_error',
      taskId,
      error: error as Error
    });

    // Return the events
    return { events };
  }
}

/**
 * Compiles a workflow definition into an executor function
 *
 * @param workflowDef The workflow definition to compile
 * @param taskImpls A map of task IDs to task implementations
 * @returns A workflow executor function
 */
export function compileWorkflow(workflowDef: WorkflowDefinition, taskImpls: TaskImplMap): WorkflowExecutor {
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
    const entryPointTaskId = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointTaskId) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }

    // Start the workflow
    const startEvent = {
      timestamp: Date.now(),
      type: 'workflow_start' as const
    };

    // Yield the event
    yield startEvent;

    try {
      // Create a stack for task execution
      const taskStack: TaskExecutionState[] = [
        { taskId: entryPointTaskId, input: options.input }
      ];

      //console.log("Initial task stack:", JSON.stringify(taskStack, null, 2));
      // Remove stack overflow check to allow proper nesting of tasks

      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        //console.log("Current stack size:", taskStack.length, "Current task:", taskStack[taskStack.length - 1].taskId);
        const currentTask = taskStack[taskStack.length - 1];
        const { taskId, generator } = currentTask;

        if (!generator) {
          // This is a new task execution, start it

          // Get the task implementation and definition
          const currentTaskImpl = taskImpls[taskId];
          const currentTaskDef = workflowDef.tasks[taskId];

          // Validate input using Zod
          //console.log("Got task definition", currentTaskDef);
          const inputType = currentTaskDef.inputType;
          const validatedInput = validateWithZod(inputType, currentTask.input, taskId, 'input');

          // Create task start event
          const taskStartEvent = {
            timestamp: Date.now(),
            type: 'task_start' as const,
            taskId,
            taskDefId: currentTaskDef.taskDefId,
            input: validatedInput
          };

          // Yield the event
          yield taskStartEvent;

          // Create task context
          const taskCtx: TaskCtx<any, any> = {
            taskDefId: currentTaskImpl.def.taskDefId,
            taskId,
            input: validatedInput,
            output: undefined,
            canCall: {},
            canCallAndReturn: {},
            taskIdToConstruct: {},
          };

          // Populate canCall and canCallAndReturn maps based on the task's relationships
          // Get the task definition from the workflow
          const taskDef = workflowDef.tasks[taskId];

          // Get the next tasks that this task can call (canCall)
          for (const nextTaskId of taskDef.nextTasks) {
            if (taskImpls[nextTaskId]) {
              taskCtx.canCall[nextTaskId] = taskImpls[nextTaskId].def;
            }
          }

          // Get the tools that this task can call and return to (canCallAndReturn)
          for (const toolTaskId of taskDef.tools) {
            if (taskImpls[toolTaskId]) {
              taskCtx.canCallAndReturn[toolTaskId] = taskImpls[toolTaskId].def;
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
          const currentTaskImpl = taskImpls[taskId];
          const currentTaskDef = workflowDef.tasks[taskId];

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
              //console.log("Returning to caller task:", currentTask.returnTo.taskId);

              // Push the caller task back onto the stack
              taskStack.push({
                taskId: currentTask.returnTo.taskId,
                input: result.events.find(e => e.type === 'task_complete')?.output,
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