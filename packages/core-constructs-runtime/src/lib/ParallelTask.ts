import { CAPABLE_WORKFLOW_TASK_DEF, Parallel } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall, getTaskCallParallel } from "@ferment-ai/runtime-common";
import * as z from 'zod';

/**
 * Creates a task implementation for the Parallel construct
 * 
 * This implementation executes multiple tasks in parallel using the getTaskCallParallel function,
 * and then optionally aggregates their results using an aggregator task.
 * 
 * @param construct The Parallel construct
 * @returns A task implementation for the Parallel construct
 */
export function createParallelTask(construct: Parallel): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      // Get the input request
      const request: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        ...ctx.input
      };

      // If there are no parallel tasks, return the input as output
      if (construct.props.parallelTasks.length === 0) {
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output: request
        };
      }

      // Execute all tasks in parallel
      const parallelCall = getTaskCallParallel(ctx, construct.props.parallelTasks);
      
      // Create an array of the same input for each parallel task
      const inputs = construct.props.parallelTasks.map(() => request);
      
      // Execute the parallel tasks and get the results
      const parallelResults = yield* parallelCall(inputs);
      
      // If there's no aggregator, return the last result
      if (!construct.props.aggregator) {
        // Use the messages from the last result as the output
        const output: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> = {
          messages: parallelResults[parallelResults.length - 1].output.messages
        };
        
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output
        };
      }
      
      // Ensure the aggregation template exists
      if (!construct.props.aggregationTemplate) {
        throw new Error("Aggregation template is required when using an aggregator");
      }
      
      // Prepare data for the template
      const templateData = {
        originalInput: request,
        results: parallelResults.map(r => r.output),
        resultCount: parallelResults.length
      };
      
      // Get the template parser task
      const templateParser = getTaskCall(ctx, construct.props.aggregationTemplate);
      
      // Execute the template parser
      const templateResult = yield* templateParser({ data: templateData });
      
      // Create a new message with the template result
      const aggregationMessage = {
        role: 'system' as const,
        content: templateResult.output.result
      };
      
      // Create the aggregator input with the original messages and the aggregation message
      const aggregatorInput = {
        messages: [...request.messages, aggregationMessage]
      };
      
      // Execute the aggregator task
      const aggregatorCall = getTaskCall(ctx, construct.props.aggregator);
      const aggregatorResult = yield* aggregatorCall(aggregatorInput);
      
      // Return the aggregator result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: aggregatorResult.output
      };
    }
  };
}