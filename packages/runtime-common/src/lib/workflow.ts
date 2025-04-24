import { z } from 'zod';
import { Construct } from 'constructs';

/**
 * Represents an error that occurred during workflow execution
 * Tracks the call stack, inputs, and constructs involved
 */
export class WorkflowError extends Error {
  public readonly callStack: WorkflowErrorStackFrame[];
  public readonly originalError?: Error;

  constructor(message: string, options: WorkflowErrorOptions = {}) {
    super(message);
    this.name = 'WorkflowError';
    this.callStack = options.callStack || [];
    this.originalError = options.originalError;
  }

  // Add a frame to the call stack
  public addFrame(frame: WorkflowErrorStackFrame): WorkflowError {
    this.callStack.unshift(frame);
    return this;
  }

  // Serialize the error for transmission
  public toJSON(): WorkflowErrorJSON {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      callStack: this.callStack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  // Create a WorkflowError from a serialized error
  public static fromJSON(json: WorkflowErrorJSON): WorkflowError {
    let originalError: Error | undefined = undefined;

    if (json.originalError) {
      originalError = new Error(json.originalError.message);
      originalError.name = json.originalError.name;
      originalError.stack = json.originalError.stack;
    }

    const error = new WorkflowError(json.message, {
      callStack: json.callStack,
      originalError
    });

    // Restore stack trace if available
    if (json.stack) {
      error.stack = json.stack;
    }

    return error;
  }
}

export interface WorkflowErrorStackFrame {
  taskDefId: string;
  nodePath: string;
  input: any;
  construct?: {
    id: string;
    path: string;
  };
}

export interface WorkflowErrorOptions {
  callStack?: WorkflowErrorStackFrame[];
  originalError?: Error;
}

export interface WorkflowErrorJSON {
  name: string;
  message: string;
  stack?: string;
  callStack: WorkflowErrorStackFrame[];
  originalError?: {
    name: string;
    message: string;
    stack?: string;
  };
}

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

// 'call' path removed as it's unused

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

/**
 * Task call error
 */
export interface TaskCallError {
  type: 'error';
  taskDefId: string;
  nodePath: string;
  input: any;
  error: {
    message: string;
    details: WorkflowError | Error | unknown;
  };
}

/**
 * Task message type union
 */
export type TaskMessage = TaskCallAndReturnRequest | TaskCallResult;

/**
 * Task execution function types
 */
export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallAndReturnRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>;

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
  error?: WorkflowError | Error;
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
 * Task execution state
 */
/**
 * Information about where to return after a callAndReturn
 */
interface ReturnToInfo {
  nodePath: string;
  generator: AsyncGenerator<any, any, any>;
}

/**
 * Task execution state
 */
interface TaskExecutionState {
  nodePath: string;
  input: any;
  generator?: AsyncGenerator<any, any, any>;
  returnTo?: ReturnToInfo;
}

/**
 * Result of a task step execution
 */
type TaskStepResult =
  | { type: 'continue'; state: TaskExecutionState }
  | { type: 'callAndReturn'; nextTask: TaskExecutionState; returnTo: ReturnToInfo }
  | { type: 'complete'; result: TaskCallResult | TaskCallError };

/**
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
function isAsyncGeneratorFunction(fn: TaskExecuteFunction<z.ZodTypeAny, z.ZodTypeAny>): boolean {
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
  taskImpl: TaskImpl<z.ZodTypeAny, z.ZodTypeAny>,
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct }
): TaskCtx<z.ZodTypeAny, z.ZodTypeAny> {
  const { nodePath, input } = taskState;
  const taskDef = workflowDef.tasks[nodePath];

  // Create the base task context
  const taskCtx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny> = {
    taskDefId: taskImpl.def.taskDefId,
    nodePath,
    input,
    output: undefined,
    canCall: {},
    canUseTools: {},
    nodePathToConstruct,
  };

  // Populate canCall and canUseTools maps
  for (const nextNodePath of taskDef.nextTasks) {
    if (taskImpls[nextNodePath]) {
      taskCtx.canCall[nextNodePath] = taskImpls[nextNodePath].def;
    }
  }

  for (const toolNodePath of taskDef.tools) {
    if (taskImpls[toolNodePath]) {
      taskCtx.canUseTools[toolNodePath] = taskImpls[toolNodePath].def;
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
  taskImpl: TaskImpl<z.ZodTypeAny, z.ZodTypeAny>,
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct }
): Promise<TaskStepResult> {
  const { nodePath, input, generator } = taskState;
  //const taskDef = workflowDef.tasks[nodePath];

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
    if (value && value.type === 'callAndReturn') {
      // Handle "callAndReturn" pattern
      return {
        type: 'callAndReturn',
        nextTask: {
          nodePath: value.nodePath,
          input: value.input
        },
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

  //console.log('Compiling workflow with tasks:', Object.keys(workflowDef.tasks));
  //console.log('Available task implementations:', Object.keys(taskImpls));

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
      //console.log("Initial task stack:", JSON.stringify(taskStack, null, 2));

      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        const currentTask = taskStack[taskStack.length - 1];
        const { nodePath } = currentTask;

        //console.log("Current stack size:", taskStack.length, "Current task:", nodePath);
        //console.log("DEBUG: Task stack:", taskStack.map(t => t.nodePath).join(', '));

        // Get task implementation and definition
        const taskImpl = taskImpls[nodePath];
        const taskDef = workflowDef.tasks[nodePath];

        if (!taskDef) {
          // TODO: update the "id" to be the full nodePath of the originator. We'll need to make changes to the taskStack to support this
          throw new Error("You did not set up getTools() for a request that you're trying to make. Construct id=" + workflowDef.name + " is trying to call path=" + nodePath + ", which has not been configured at compile time");
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

          /*
          console.log(`DEBUG: Executing task ${nodePath} with input:`, JSON.stringify({
            hasMessages: !!currentTask.input?.messages,
            messageCount: currentTask.input?.messages?.length
          }));
          */
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


          case 'callAndReturn':
            // Push next task onto stack with return information
            taskStack = pushTask(taskStack, {
              ...result.nextTask,
              returnTo: result.returnTo
            });
            //console.log(`Task ${nodePath} is calling task ${result.nextTask.nodePath} with 'callAndReturn' type`);
            break;

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
              //console.log(`Task ${nodePath} completed with output`);
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

              //console.log(`Task ${nodePath} failed with error: ${result.result.error.message}`);
            }

            // Pop current task from stack
            const popResult = popTask(taskStack);
            taskStack = popResult[0];
            //console.log(`Popped task ${nodePath} from stack`);

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
                //console.log(`Task ${nodePath} returning to caller ${currentTask.returnTo.nodePath} (already on stack)`);
              } else {
                // Caller is not on the stack, push it
                taskStack = pushTask(taskStack, {
                  nodePath: currentTask.returnTo.nodePath,
                  input: result.result,
                  generator: currentTask.returnTo.generator
                });
                //console.log(`Task ${nodePath} returning to caller ${currentTask.returnTo.nodePath}`);
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
          //console.log(`WARNING: Task ${nodePath} started but didn't complete`);
        }
      }

      // Throw error if there are incomplete tasks
      if (incompleteTasks.length > 0) {
        throw new Error(
          `WORKFLOW BUG: The following tasks started but didn't complete: ${incompleteTasks.join(', ')}. ` +
          `This is a bug in the workflow execution engine. Check if these tasks are using 'callAndReturn' correctly.`
        );
      }

      //console.log("=== WORKFLOW EXECUTION COMPLETE ===");

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
  };
}