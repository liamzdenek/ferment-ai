import { z } from 'zod';
import { Construct } from 'constructs';
import { WorkflowDefinition } from '../definitions/WorkflowDefinition.js';
import { TaskDefinition } from '../definitions/TaskDefinition.js';
import { WorkflowTask } from './WorkflowTask.js';

/**
 * Options for creating a workflow
 */
export interface WorkflowOptions {
  /**
   * The entry point task for the workflow
   */
  definition: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>;

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
  private readonly definition: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>;

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
  private addReachableTasks(task: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>, tasks: Record<string, TaskDefinition>): void {
    // Add tools
    for (const [, tool] of Object.entries(task.getTools())) {
      if (!tasks[tool.node.path]) {
        tasks[tool.node.path] = tool.getDefinition();
        this.addReachableTasks(tool, tasks);
      }
    }
  }
}