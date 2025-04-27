import { Construct } from "constructs";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { z } from "zod";
import { WorkflowTask } from "@ferment-ai/runtime-common";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";

export interface ParallelProps {
  /**
   * Tasks to execute in parallel
   */
  parallelTasks: Array<CapableWorkflowTask>;
  
  /**
   * Aggregator task that runs after all parallel tasks complete
   * If not provided, the results will be returned as is
   */
  aggregator?: CapableWorkflowTask;
  
  /**
   * Template parser for aggregating results from parallel tasks
   * This is used to format the input to the aggregator task
   */
  aggregationTemplate?: BaseTemplateParser;
}

/**
 * Parallel construct for executing multiple tasks in parallel
 * 
 * This construct allows executing multiple CapableWorkflowTasks in parallel,
 * and optionally aggregating their results using an aggregator task.
 * 
 * Example usage:
 * ```typescript
 * const parallel = new Parallel(this, 'Parallel', {
 *   parallelTasks: [task1, task2, task3],
 *   aggregator: aggregatorTask,
 *   aggregationTemplate: templateParser
 * });
 * ```
 */
export class Parallel extends CapableWorkflowTask {
  public readonly props: ParallelProps;

  constructor(
    scope: Construct,
    id: string,
    props?: Partial<ParallelProps>
  ) {
    super(scope, id, {})
    this.props = {
      parallelTasks: [],
      ...props
    };
  }

  /**
   * Add a task to be executed in parallel
   * @param task The task to add
   */
  addParallelTask(task: CapableWorkflowTask) {
    this.props.parallelTasks.push(task);
  }

  /**
   * Set the aggregator task
   * @param aggregator The aggregator task
   */
  setAggregator(aggregator: CapableWorkflowTask) {
    this.props.aggregator = aggregator;
  }

  /**
   * Set the aggregation template parser
   * @param template The template parser
   */
  setAggregationTemplate(template: BaseTemplateParser) {
    this.props.aggregationTemplate = template;
  }

  override getReachableTasks(): [string, string][] {
    const tasks: [string, string][] = {
      ...super.getReachableTasks()
    };
    
    // Add all parallel tasks
    for (const task of this.props.parallelTasks) {
      tasks.push([this.node.path, task.node.path]);
    }
    
    // Add aggregator if present
    if (this.props.aggregator) {
      tasks.push([this.node.path, this.props.aggregator.node.path])
    }
    
    // Add aggregation template if present
    if (this.props.aggregationTemplate) {
      tasks.push([this.node.path, this.props.aggregationTemplate.node.path])
    }
    
    return tasks;
  }
}