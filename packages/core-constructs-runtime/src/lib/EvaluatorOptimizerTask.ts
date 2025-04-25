import { CAPABLE_WORKFLOW_TASK_DEF, EvaluatorOptimizer } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall } from "@ferment-ai/runtime-common";
import * as z from 'zod';
import { getStructuredOutputFromTask } from "./util.js";

export function createEvaluatorOptimizerTask(construct: EvaluatorOptimizer): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      // Extract the input messages
      const input = ctx.input;
      const messages = input.messages;
      
      // Get the original prompt from the last user message
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      const originalPrompt = lastUserMessage?.content || '';
      
      // Initialize variables for the optimization loop
      let currentIteration = 0;
      let bestScore = 0;
      let bestResponse = '';
      let feedback = '';
      let score = 0;
      let shouldContinue = true;
      
      // Run the optimization loop
      while (currentIteration < construct.props.iterationHardLimit && shouldContinue) {
        currentIteration++;
        
        // Format the optimizer template with feedback if available
        const templateResult = yield* getTaskCall(ctx, construct.props.optimizerTemplate)({
          data: {
            originalPrompt,
            feedback: currentIteration > 1 ? feedback : '',
            score: currentIteration > 1 ? score : 0
          }
        });
        const optimizerPrompt = templateResult.output.result;
        
        // Create a new input with the optimizer prompt as a new message
        const optimizerInput = {
          messages: [
            ...messages,
            {
              role: 'user' as const,
              content: optimizerPrompt,
              category: 'input' as const
            }
          ]
        };
        
        // Run the optimizer task
        const optimizerResult = yield* getTaskCall(ctx, construct.props.optimizerTask)(optimizerInput);
        
        // Extract the optimizer response
        const optimizerResponse = optimizerResult.output.messages[optimizerResult.output.messages.length - 1].content;
        
        // Format the evaluator template
        const evaluatorTemplateResult = yield* getTaskCall(ctx, construct.props.evaluatorTemplate)({
          data: {
            originalPrompt,
            response: optimizerResponse
          }
        });
        const evaluatorPrompt = evaluatorTemplateResult.output.result;
        
        // Create input for the evaluator with the full conversation history
        const evaluatorInput = {
          messages: [
            ...messages,
            {
              role: 'user' as const,
              content: optimizerPrompt,
              category: 'input' as const
            },
            {
              role: 'assistant' as const,
              content: optimizerResponse,
              category: 'response' as const
            },
            {
              role: 'user' as const,
              content: evaluatorPrompt,
              category: 'input' as const
            }
          ]
        };
        
        // Run the evaluator
        if (!construct.props.evaluatorOutput) {
          throw new Error("evaluatorOutput is undefined");
        }
        
        const evaluatorResult = yield* getStructuredOutputFromTask(
          ctx,
          construct.props.evaluatorOutput,
          evaluatorInput
        );
        
        // Extract evaluation results
        score = evaluatorResult.output.score;
        feedback = evaluatorResult.output.feedback;
        const targetScore = construct.props.targetScore ?? 8;
        shouldContinue = evaluatorResult.output.shouldContinue && score < targetScore;
        
        // Update best response if this is the highest score so far
        if (score > bestScore) {
          bestScore = score;
          bestResponse = optimizerResponse;
        }
        
        // If we've reached the target score, we can stop
        if (score >= targetScore) {
          shouldContinue = false;
        }
      }
      
      // Create the final output with the best response
      const output = {
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: bestResponse,
            category: 'response'
          }
        ]
      };
      
      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output
      };
    }
  };
}