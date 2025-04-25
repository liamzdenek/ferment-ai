import { z } from 'zod';
import { Construct } from 'constructs';
import { TaskDef } from '../definitions/TaskDef.js';
import { TaskDefinition } from '../definitions/TaskDefinition.js';

/**
 * Options for creating a task
 */
export interface WorkflowTaskOptions {
  _unused?: string;
}

/**
 * A task in a workflow
 */
export abstract class WorkflowTask<I extends z.ZodTypeAny, O extends z.ZodTypeAny> extends Construct {

  /**
   * The task definition for this model
   */
  public abstract readonly taskDef: TaskDef<I, O>;

  /**
   * The tools that can be called by this task
   */
  private readonly tools: Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> = {};

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
   * Adds a task that can be called and returned to by this task
   *
   * @param tool The tool that can be called
   * @returns This task
   */
  canUseTools(tool: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>): this {
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

    // Get the tools
    const tools = Object.keys(this.getTools());

    return {
      id: this.node.path,
      name: this.node.id,
      taskDefId: this.taskDef.taskDefId,
      inputType: this.taskDef.inputType,
      outputType: this.taskDef.outputType,
      tools
    };
  }

  /**
   * Gets the tools that can be called by this task
   *
   * @returns The tools
   */
  getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return { ...this.tools };
  }
}

export function isWorkflowTask(construct: Construct): construct is WorkflowTask<z.ZodTypeAny, z.ZodTypeAny> {
  return construct instanceof WorkflowTask;
}

/**
 * An end task in a workflow
 */
export class WorkflowEndTask extends WorkflowTask<z.ZodTypeAny, z.ZodTypeAny> {
  /**
   * Default task definition for end tasks
   */
  private static readonly END_TASK_DEF: TaskDef<z.ZodTypeAny, z.ZodTypeAny> = {
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