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
  definition: WorkflowTask<any, any>;

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
  private readonly definition: WorkflowTask<any, any>;

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
  private addReachableTasks(task: WorkflowTask<any, any>, tasks: Record<string, TaskDefinition>): void {
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
  _unused?: string;
}

/**
 * A task in a workflow
 */
export abstract class WorkflowTask<I extends z.ZodTypeAny,O extends z.ZodTypeAny> extends Construct {

  /**
   * The task definition for this model
   */
  public abstract readonly taskDef: TaskDef<I, O>;

  /**
   * The next tasks in the workflow
   */
  private readonly nextTasks: WorkflowTask<any, any>[] = [];

  /**
   * The tools that can be called by this task
   */
  private readonly tools: Record<string, WorkflowTask<any, any>> = {};

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
  }

  /**
   * Adds a task that can be called by this task
   *
   * @param task The task that can be called
   * @returns This task
   */
  canCall(task: WorkflowTask<any, any>): this {
    this.nextTasks.push(task);
    return this;
  }

  /**
   * Adds a task that can be called and returned to by this task
   *
   * @param tool The tool that can be called
   * @returns This task
   */
  canCallAndReturn(tool: WorkflowTask<any, any>): this {
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
    if (!this.taskDef) {
      throw new Error(`Task ${this.node.id} does not have a taskDef defined`);
    }

    // Get the next tasks
    const nextTasks = this.getNextTasks().map(task => task.node.path);

    // Get the tools
    const tools = Object.keys(this.getTools());

    return {
      id: this.node.path,
      name: this.node.id,
      taskDefId: this.taskDef.taskDefId,
      inputType: this.taskDef.inputType,
      outputType: this.taskDef.outputType,
      nextTasks,
      tools
    };
  }

  /**
   * Gets the next tasks in the workflow
   *
   * @returns The next tasks
   */
  getNextTasks(): WorkflowTask<any, any>[] {
    return [...this.nextTasks];
  }

  /**
   * Gets the tools that can be called by this task
   *
   * @returns The tools
   */
  getTools(): Record<string, WorkflowTask<any, any>> {
    return { ...this.tools };
  }
}

/**
 * An end task in a workflow
 */
export class WorkflowEndTask extends WorkflowTask<any, any> {
  /**
   * Default task definition for end tasks
   */
  private static readonly END_TASK_DEF: TaskDef<any, any> = {
    taskDefId: 'end-task',
    inputType: z.any(),
    outputType: z.any()
  };

  public override readonly taskDef = WorkflowEndTask.END_TASK_DEF;

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
      ...options
    });
  }
}