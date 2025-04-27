import { z } from 'zod';
import { Construct, RootConstruct } from 'constructs';
import { WorkflowDefinition } from '../definitions/WorkflowDefinition.js';
import { TaskDefinition } from '../definitions/TaskDefinition.js';
import { WorkflowTask, isWorkflowTask } from './WorkflowTask.js';
import { getConstructFromNodePath } from '../utils/ConstructUtils.js';

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

    // Add all tasks reachable from the entry point
    this.addReachableTasks(this.definition, tasks);

    return {
      id: this.node.id,
      name: this.node.id,
      description: this.options.description,
      tasks,
      entryPoint: this.definition.node.path
    };
  }

  /**
   * Adds all tasks reachable from a task to the tasks map
   *
   * @param task The task to start from
   * @param tasks The tasks map to add to
   */
  private addReachableTasks(task: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>, tasks: Record<string, TaskDefinition>): void {
    // Queue for breadth-first search
    const queue: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>[] = [task];
    // Set to track visited tasks to avoid cycles
    const visited = new Set<string>();
    // Map to track all reachable tasks relationships
    const reachableTasksMap = new Map<string, Set<string>>();

    tasks[task.node.path] = {
      ...task.getDefinition(),
      reachableTasks: [],
    }

    // Process tasks in breadth-first order
    while (queue.length > 0) {
      const currentTask = queue.shift()!;
      const currentTaskPath = currentTask.node.path;
      
      // Skip if already visited
      if (visited.has(currentTaskPath)) {
        continue;
      }
      
      // Mark as visited
      visited.add(currentTaskPath);
      
      // Get reachable tasks from the current task
      const reachableTasks = currentTask.getReachableTasks();


      for (const [sourcePath, destPath] of reachableTasks) {
        console.log(`>>>> ${sourcePath} ---> ${destPath}`);
      }
      
      // Process each reachable task
      for (const [sourcePath, destPath] of reachableTasks) {
        // Add to the reachable tasks map
        if (!reachableTasksMap.has(sourcePath)) {
          reachableTasksMap.set(sourcePath, new Set<string>());
        }
        reachableTasksMap.get(sourcePath)!.add(destPath);
        
        // Find the destination task construct by traversing the construct tree
        const destConstruct: Construct | undefined = getConstructFromNodePath(this.node.root, destPath);
        
        // Check if the destination is a WorkflowTask
        if (destConstruct && isWorkflowTask(destConstruct)) {
          const destTask = destConstruct as WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>;
          
          // Add the task definition to the tasks map if not already there
          if (!tasks[destPath]) {
            console.log("Pushing task defn", destPath);
            tasks[destPath] = {
              ...destTask.getDefinition(),
              reachableTasks: [],
            }
          }
          
          // Add to the queue for further processing if not visited
          if (!visited.has(destPath)) {
            queue.push(destTask);
          }
        }
      }
    }
    
    // Update all task definitions with their reachable tasks
    for (const [sourcePath, destPaths] of reachableTasksMap.entries()) {
      if (tasks[sourcePath]) {
        // Convert the Set to an array of tuples
        const reachableTasks: [string, string][] = [];
        for (const destPath of destPaths) {
          reachableTasks.push([sourcePath, destPath]);
        }
        
        // Update the task definition
        tasks[sourcePath].reachableTasks = reachableTasks.map(v => v[1]);
      }
    }
  }
}