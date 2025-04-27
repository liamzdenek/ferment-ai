import { z } from 'zod';
import { Construct } from 'constructs';
import { TaskDef } from '../definitions/TaskDef.js';
import { PreCompileTaskDefinition, TaskDefinition } from '../definitions/TaskDefinition.js';

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
  getDefinition(): PreCompileTaskDefinition {
    if (!this.taskDef) {
      throw new Error(`Task ${this.node.id} does not have a taskDef defined`);
    }

    return {
      id: this.node.path,
      name: this.node.id,
      taskDefId: this.taskDef.taskDefId,
      inputType: this.taskDef.inputType,
      outputType: this.taskDef.outputType
    };
  }

  /**
   * Gets the tools that can be called by this task. We expect you to override this and push new items
   * 
   * [ [this.node.path, this.otherConstruct.node.path] ]
   *
   * @returns The tools
   */
  getReachableTasks(): [string, string][] {
    return [];
  }
}

export function isWorkflowTask(construct: Construct): construct is WorkflowTask<z.ZodTypeAny, z.ZodTypeAny> {
  return construct instanceof WorkflowTask;
}