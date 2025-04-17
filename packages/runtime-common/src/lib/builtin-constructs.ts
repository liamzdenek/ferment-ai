import { z } from 'zod';
import { Construct } from 'constructs';
import { TaskDef, TaskDefinition, WorkflowDefinition } from './workflow.js';


/**
 * Options for creating a workflow
 */
export interface WorkflowOptions {
  /**
   * The entry point task for the workflow
   */
  definition: WorkflowTask;

  /**
   * A description of what the workflow does
   */
  description?: string;
}

/**
 * Workflow class
 */
export class Workflow extends Construct {
  /**
   * The entry point task for the workflow
   */
  private readonly definition: WorkflowTask;

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
  private addReachableTasks(task: WorkflowTask, tasks: Record<string, TaskDefinition>): void {
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
 * Options for creating a task
 */
export interface WorkflowTaskOptions {
  /**
   * The task definition - required for all tasks
   */
  taskDef: TaskDef<any, any>;
}

/**
 * A task in a workflow
 */
export class WorkflowTask extends Construct {

  /**
   * The task definition for this model
   */
  public readonly taskDef: TaskDef<any, any>;

  /**
   * The next tasks in the workflow
   */
  private readonly nextTasks: WorkflowTask[] = [];

  /**
   * The tools that can be called by this task
   */
  private readonly tools: Record<string, WorkflowTask> = {};

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
    private readonly options: WorkflowTaskOptions
  ) {
    super(scope, id);
    this.taskDef = options.taskDef;
  }

  /**
   * Adds a task that can be called by this task
   *
   * @param task The task that can be called
   * @returns This task
   */
  canCall(task: WorkflowTask): this {
    this.nextTasks.push(task);
    return this;
  }

  /**
   * Adds a task that can be called and returned to by this task
   *
   * @param tool The tool that can be called
   * @returns This task
   */
  canCallAndReturn(tool: WorkflowTask): this {
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
  getNextTasks(): WorkflowTask[] {
    return [...this.nextTasks];
  }

  /**
   * Gets the tools that can be called by this task
   *
   * @returns The tools
   */
  getTools(): Record<string, WorkflowTask> {
    return { ...this.tools };
  }
}

/**
 * An end task in a workflow
 */
export class WorkflowEndTask extends WorkflowTask {
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
    options?: Partial<WorkflowTaskOptions>
  ) {
    super(scope, id, {
      description: options?.description || 'End of workflow',
      taskDef: WorkflowEndTask.END_TASK_DEF,
      ...options
    });
  }
}