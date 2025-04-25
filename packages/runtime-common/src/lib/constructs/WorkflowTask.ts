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
   * Gets the task definition
   *
   * @returns The task definition
   */
  getDefinition(): TaskDefinition {
    if (!this.taskDef) {
      throw new Error(`Task ${this.node.id} does not have a taskDef defined`);
    }

    // Get the tools
    const reachableTasks = Object.keys(this.getReachableTasks());

    return {
      id: this.node.path,
      name: this.node.id,
      taskDefId: this.taskDef.taskDefId,
      inputType: this.taskDef.inputType,
      outputType: this.taskDef.outputType,
      reachableTasks
    };
  }

  /**
   * Gets the tools that can be called by this task. We expect you to override this and push new items
   * 
   * { [construct.node.path]: construct }
   *
   * @returns The tools
   */
  getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {};
  }
}

export function isWorkflowTask(construct: Construct): construct is WorkflowTask<z.ZodTypeAny, z.ZodTypeAny> {
  return construct instanceof WorkflowTask;
}