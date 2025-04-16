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

/**
 * Task message type union
 */
export type TaskMessage = TaskCallAndReturnRequest | TaskCallRequest | TaskCallResult;

/**
 * Task execution function types
 */
export type TaskExecuteGenerator<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => AsyncGenerator<TaskCallAndReturnRequest, TaskCallRequest | TaskCallResult, TaskCallResult>;

export type TaskExecutePromise<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  (ctx: TaskCtx<I, O>) => Promise<TaskCallResult>;

export type TaskExecuteFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny> =
  TaskExecuteGenerator<I, O> | TaskExecutePromise<I, O>;

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
 * Workflow class
 */
export class Workflow extends Construct {
  /**
   * The entry point task for the workflow
   */
  private readonly definition: Workflow.Task;

  /**
   * Creates a new workflow
   *
   * @param scope The scope in which to define this construct
   * @param id The scoped ID of the construct
   * @param options The options for the workflow
   */
  constructor(
    scope: Construct,
    id: string,
    private readonly options: WorkflowOptions
  ) {
    super(scope, id);
    this.definition = options.definition;
  }

  /**
   * Gets the workflow definition
   *
   * @returns The workflow definition
   */
  getDefinition(): WorkflowDefinition {
    const tasks: Record<string, TaskDefinition> = {};
    const entryPoints: Record<string, string> = {
      'default': this.definition.node.path
    };

    // Add the entry point task
    tasks[this.definition.node.path] = this.definition.getDefinition();

    // Add all tasks reachable from the entry point
    this.addReachableTasks(this.definition, tasks);

    return {
      id: this.node.id,
      name: this.node.id,
      description: this.options.description,
      tasks,
      entryPoints
    };
  }

  /**
   * Adds all tasks reachable from a task to the tasks map
   *
   * @param task The task to start from
   * @param tasks The tasks map to add to
   */
  private addReachableTasks(task: Workflow.Task, tasks: Record<string, TaskDefinition>): void {
    // Add next tasks
    for (const nextTask of task.getNextTasks()) {
      if (!tasks[nextTask.node.path]) {
        tasks[nextTask.node.path] = nextTask.getDefinition();
        this.addReachableTasks(nextTask, tasks);
      }
    }

    // Add tools
    for (const [, tool] of Object.entries(task.getTools())) {
      if (!tasks[tool.node.path]) {
        tasks[tool.node.path] = tool.getDefinition();
        this.addReachableTasks(tool, tasks);
      }
    }
  }
}

/**
 * Workflow namespace for task-related classes
 */
export namespace Workflow {
  /**
   * Options for creating a task
   */
  export interface TaskOptions {
    /**
     * The input type for the task
     */
    inputType?: z.ZodTypeAny;

    /**
     * The output type for the task
     */
    outputType?: z.ZodTypeAny;

    /**
     * The task definition ID
     */
    taskDefId?: string;

    /**
     * A description of what the task does
     */
    description?: string;

    /**
     * The task definition - required for all tasks
     */
    taskDef: TaskDef<any, any>;
  }

  /**
   * A task in a workflow
   */
  export class Task extends Construct {
    /**
     * The next tasks in the workflow
     */
    private readonly nextTasks: Task[] = [];

    /**
     * The tools that can be called by this task
     */
    private readonly tools: Record<string, Task> = {};

    /**
     * Creates a new task
     *
     * @param scope The scope in which to define this construct
     * @param id The scoped ID of the construct
     * @param options The options for the task
     */
    constructor(
      scope: Construct,
      id: string,
      private readonly options: TaskOptions
    ) {
      super(scope, id);
    }

    /**
     * Adds a task that can be called by this task
     *
     * @param task The task that can be called
     * @returns This task
     */
    canCall(task: Task): this {
      this.nextTasks.push(task);
      return this;
    }

    /**
     * Adds a task that can be called and returned to by this task
     *
     * @param tool The tool that can be called
     * @returns This task
     */
    canCallAndReturn(tool: Task): this {
      const toolPath = tool.node.path;
      this.tools[toolPath] = tool;
      return this;
    }
    /**
     * Gets the task definition
     *
     * @returns The task definition
     */
    getDefinition(): TaskDefinition {
      if (!this.options.taskDef) {
        throw new Error(`Task ${this.node.id} does not have a taskDef defined`);
      }
      
      // Get the next tasks
      const nextTasks = this.getNextTasks().map(task => task.node.path);
      
      // Get the tools
      const tools = Object.keys(this.getTools());
      
      return {
        id: this.node.path,
        name: this.node.id,
        description: this.options.description,
        taskDefId: this.options.taskDef.taskDefId,
        inputType: this.options.taskDef.inputType,
        outputType: this.options.taskDef.outputType,
        nextTasks,
        tools
      };
    }

    /**
     * Gets the next tasks in the workflow
     *
     * @returns The next tasks
     */
    getNextTasks(): Task[] {
      return [...this.nextTasks];
    }

    /**
     * Gets the tools that can be called by this task
     *
     * @returns The tools
     */
    getTools(): Record<string, Task> {
      return { ...this.tools };
    }
  }

  /**
   * An end task in a workflow
   */
  export class EndTask extends Task {
    /**
     * Default task definition for end tasks
     */
    private static readonly END_TASK_DEF: TaskDef<any, any> = {
      taskDefId: 'end-task',
      inputType: z.any(),
      outputType: z.any()
    };

    /**
     * Creates a new end task
     *
     * @param scope The scope in which to define this construct
     * @param id The scoped ID of the construct
     * @param options The options for the task (optional)
     */
    constructor(
      scope: Construct,
      id: string,
      options?: Partial<TaskOptions>
    ) {
      super(scope, id, {
        description: options?.description || 'End of workflow',
        taskDef: EndTask.END_TASK_DEF,
        ...options
      });
    }
  }
}

/**
 * Options for creating a workflow
 */
export interface WorkflowOptions {
  /**
   * The entry point task for the workflow
   */
  definition: Workflow.Task;

  /**
   * A description of what the workflow does
   */
  description?: string;
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
 * Execute a task as a promise
 * 
 * @param taskState The task execution state
 * @param taskImpl The task implementation
 * @param taskDef The task definition
 * @param taskCtx The task context
 * @param taskStack The task execution stack
 * @param workflowDef The workflow definition
 * @returns A generator that yields workflow log events
 */
async function* executeTaskAsPromise(
  taskState: TaskExecutionState,
  taskImpl: TaskImpl<any, any>,
  taskDef: TaskDefinition,
  taskCtx: TaskCtx<any, any>,
  taskStack: TaskExecutionState[],
  workflowDef: WorkflowDefinition
): AsyncGenerator<WorkflowLogEvent, void, unknown> {
  const { taskId, returnTo } = taskState;
  
  try {
    // Execute the task function and get the result
    const result = await (taskImpl.execute as TaskExecutePromise<any, any>)(taskCtx);
    
    // Validate output using Zod
    const outputType = taskDef.outputType;
    let validatedOutput;
    
    if (result && result.type === 'result') {
      validatedOutput = validateWithZod(outputType, result.output, taskId, 'output');
      
      // Complete the task
      yield {
        timestamp: Date.now(),
        type: 'task_complete',
        taskId,
        output: validatedOutput
      };
      
      // If this task was called by another task using canCallAndReturn, we need to
      // push the caller task back onto the stack so it can continue execution
      if (returnTo) {
        // Push the caller task back onto the stack
        taskStack.push({
          taskId: returnTo.taskId,
          input: validatedOutput,
          generator: returnTo.generator
        });
      }
      
      // If this task was called by another task, return the result to the caller
      if (returnTo && taskStack.length > 0) {
        const callerTask = taskStack[taskStack.length - 1];
        callerTask.input = validatedOutput;
      }
    } else if (result && (result.type as string) === 'call') {
      // Handle direct call (canCall)
      const { taskDefId, taskId: nextTaskId, input: nextInput } = result;
      
      if (workflowDef.tasks[nextTaskId]) {
        taskStack.push({
          taskId: nextTaskId,
          input: nextInput
        });
      } else {
        throw new Error(`Unknown task ID for call: ${nextTaskId}`);
      }
    }
    
    // Remove the current task from the stack since it's completed
    taskStack.pop();
  } catch (error) {
    // Handle task error
    yield {
      timestamp: Date.now(),
      type: 'task_error',
      taskId,
      error: error as Error
    };
    
    // Remove the current task from the stack
    taskStack.pop();
    
    // If this task was called by another task, return the error to the caller
    if (returnTo && taskStack.length > 0) {
      const callerTask = taskStack[taskStack.length - 1];
      callerTask.input = { error };
    }
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
  
  try {
    if (!generator) {
      throw new Error('Generator is undefined');
    }
    
    const { value, done } = await generator.next(input);
    
    if (done) {
      // Generator has completed
      
      // Validate output using Zod
      const outputType = taskDef.outputType;
      let validatedOutput;
      
      if (value && value.type === 'result') {
        validatedOutput = validateWithZod(outputType, value.output, taskId, 'output');
        
        // Complete the task
        events.push({
          timestamp: Date.now(),
          type: 'task_complete',
          taskId,
          output: validatedOutput
        });
        
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
        
        if (workflowDef.tasks[toolId]) {
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

  console.log('Compiling workflow with tasks:', Object.keys(workflowDef.tasks));
  console.log('Available task implementations:', Object.keys(taskImpls));
  
  // Validate that all tasks have corresponding task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    console.log(`Checking task implementation for task path: ${taskPath}`);
    if (!taskImpls[taskPath]) {
      console.log(`Task implementation not found for task path: ${taskPath}`);
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }
  }

  // Return the workflow executor function
  return async function* (options: WorkflowExecutionOptions): AsyncIterable<WorkflowLogEvent> {
    // Validate the entry point
    const entryPointTaskId = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointTaskId) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }

    // Start the workflow
    yield {
      timestamp: Date.now(),
      type: 'workflow_start'
    };

    try {
      // Create a stack for task execution
      const taskStack: TaskExecutionState[] = [
        { taskId: entryPointTaskId, input: options.input }
      ];

      console.log("Task stack", taskStack);
      if(taskStack.length > 2) { throw new Error("Stack overflow"); }
      
      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
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
          
          // Start the task
          yield {
            timestamp: Date.now(),
            type: 'task_start',
            taskId,
            input: validatedInput
          };
          
          // Create task context
          const taskCtx: TaskCtx<any, any> = {
            taskDefId: currentTaskImpl.def.taskDefId,
            taskId,
            input: validatedInput,
            output: undefined,
            canCall: {},
            canCallAndReturn: {}
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
          
          if (isAsyncGeneratorFunction(executeFunction)) {
            // Execute the task as an async generator
            currentTask.generator = executeFunction(taskCtx) as AsyncGenerator<any, any, any>;
            
            // Process the generator in the next iteration
            continue;
          } else {
            // Execute the task as a promise
            for await (const event of executeTaskAsPromise(
              currentTask,
              currentTaskImpl,
              currentTaskDef,
              taskCtx,
              taskStack,
              workflowDef
            )) {
              yield event;
            }
            
            // Continue to the next task
            continue;
          }
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
          
          // Yield any events from the generator
          for (const event of result.events) {
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
            if (currentTask.returnTo && taskStack.length > 0) {
              const callerTask = taskStack[taskStack.length - 1];
              callerTask.input = undefined; // No specific result to return
            }
          }
        }
      }
      
      // Complete the workflow when the stack is empty
      yield {
        timestamp: Date.now(),
        type: 'workflow_complete'
      };
    } catch (error) {
      // Handle workflow error
      yield {
        timestamp: Date.now(),
        type: 'workflow_error',
        error: error as Error
      };
    }
  };
}