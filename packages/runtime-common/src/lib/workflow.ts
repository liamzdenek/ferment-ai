import { z } from 'zod';
import { Construct } from 'constructs';

/**
 * Schema for a task input or output
 */
export const TaskSchemaSchema = z.object({
  type: z.string().describe('The type of the schema'),
  schema: z.any().describe('The Zod schema for validation')
});

export type TaskSchema = z.infer<typeof TaskSchemaSchema>;

/**
 * Schema for a task
 */
export const TaskDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the task'),
  name: z.string().describe('The name of the task'),
  description: z.string().optional().describe('A description of what the task does'),
  inputSchema: TaskSchemaSchema.describe('The schema for the task input'),
  outputSchema: TaskSchemaSchema.describe('The schema for the task output')
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
 * A task function that executes a task
 */
export type TaskFunction<TInput = any, TOutput = any> = (input: TInput) => Promise<TOutput>;

/**
 * A map of task IDs to task functions
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
     * The input schema for the task
     */
    inputSchema?: TaskSchema;

    /**
     * The output schema for the task
     */
    outputSchema?: TaskSchema;

    /**
     * A description of what the task does
     */
    description?: string;
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
      private readonly options: TaskOptions = {}
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
     * Creates a tool that can be used to send an email
     *
     * @returns A task that can be used as a tool
     */
    sendEmailTool(): Task {
      const tool = new Task(this, `${this.node.id}SendEmailTool`, {
        description: `Send an email to ${this.node.id}`
      });
      return tool;
    }

    /**
     * Gets the task definition
     *
     * @returns The task definition
     */
    getDefinition(): TaskDefinition {
      return {
        id: this.node.path,
        name: this.node.id,
        description: this.options.description,
        inputSchema: this.options.inputSchema || {
          type: 'object',
          schema: {}
        },
        outputSchema: this.options.outputSchema || {
          type: 'object',
          schema: {}
        }
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
     * Creates a new end task
     *
     * @param scope The scope in which to define this construct
     * @param id The scoped ID of the construct
     * @param options The options for the task
     */
    constructor(
      scope: Construct,
      id: string,
      options: TaskOptions = {}
    ) {
      super(scope, id, {
        ...options,
        description: options.description || 'End of workflow'
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
 * Compiles a workflow definition into an executor function
 *
 * @param workflowDef The workflow definition to compile
 * @param taskFunctions A map of task IDs to task functions
 * @returns A workflow executor function
 */
export function compileWorkflow(workflowDef: WorkflowDefinition, taskFunctions: TaskFunctionMap): WorkflowExecutor {
  // Validate the workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);

  console.log('Compiling workflow with tasks:', Object.keys(workflowDef.tasks));
  console.log('Available task functions:', Object.keys(taskFunctions));
  
  // Validate that all tasks have corresponding task functions
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    console.log(`Checking task function for task path: ${taskPath}`);
    if (!taskFunctions[taskPath]) {
      console.log(`Task function not found for task path: ${taskPath}`);
      throw new Error(`Task function not found for task path: ${taskPath}`);
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
      const taskStack: { taskId: string, input: any, returnTo?: { taskId: string, context: any } }[] = [
        { taskId: entryPointTaskId, input: options.input }
      ];
      
      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        const currentTask = taskStack.pop()!;
        const { taskId, input, returnTo } = currentTask;
        // Get the task function by path
        const taskFunction = taskFunctions[taskId];
        
        // Start the task
        yield {
          timestamp: Date.now(),
          type: 'task_start',
          taskId,
          input
        };
        
        try {
          // Execute the task
          const output = await taskFunction(input);
          
          // Complete the task
          yield {
            timestamp: Date.now(),
            type: 'task_complete',
            taskId,
            output
          };
          
          // If this task was called by another task (canCallAndReturn), return to the caller
          if (returnTo) {
            // Push the caller back on the stack with the result from this task
            taskStack.push({
              taskId: returnTo.taskId,
              input: {
                ...returnTo.context,
                result: output
              }
            });
          }
          // Handle canCall - check if the output specifies a next task to call
          else if (output && output.nextTaskId) {
            const nextTaskId = output.nextTaskId;
            if (workflowDef.tasks[nextTaskId]) {
              taskStack.push({
                taskId: nextTaskId,
                input: output.nextTaskInput || output
              });
            }
          }
          // Handle canCallAndReturn - check if the output specifies a tool to call
          else if (output && output.toolCall) {
            const { toolId, toolInput } = output.toolCall;
            if (workflowDef.tasks[toolId]) {
              // Push the tool on the stack to execute it
              taskStack.push({
                taskId: toolId,
                input: toolInput,
                returnTo: {
                  taskId,
                  context: output.context || {}
                }
              });
            }
          }
        } catch (error) {
          // Handle task error
          yield {
            timestamp: Date.now(),
            type: 'task_error',
            taskId,
            error: error as Error
          };
          
          // If this task was called by another task, return the error to the caller
          if (returnTo) {
            taskStack.push({
              taskId: returnTo.taskId,
              input: {
                ...returnTo.context,
                error: error
              }
            });
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