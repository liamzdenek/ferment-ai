import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, CapableWorkflowTask, LLMGate, STRUCTURED_OUTPUT_TASK_DEF } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall, TaskCallAndReturnRequest, TaskCallError, TaskCallResult } from "@ferment-ai/runtime-common";
import { PromptSchema } from "@modelcontextprotocol/sdk/types.js";
import * as z from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { getStructuredOutputFromTask } from "./util.js";

export function createLlmGateTask(construct: LLMGate): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      const prompt = yield* getPrompt(construct, ctx);

      // Prepare the input with the prompt
      const query: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType> = {
        messages: [
          ...ctx.input.messages,
          {
            role: "user",
            content: prompt
          }
        ],
      };

      // Handle different condition types
      if (construct.props.condition.type === 'pass_if_in_range' || construct.props.condition.type === 'fail_if_in_range') {
        const condition = construct.props.condition;

        const result = yield* getStructuredOutputFromTask(ctx, construct.props.condition.structuredOutput, query)

        console.log('got structured output', result.output);
        
        // Check if the score passes the condition (using gte/lte fields)
        const score = result.output.score;
        const passesThreshold = score >= condition.gte && score <= condition.lte;
        
        // Determine if we passed based on the condition type
        const passed = condition.type === 'pass_if_in_range' ? passesThreshold : !passesThreshold;
        
        // If we didn't pass, throw an exception
        if (!passed) {
          throw new Error(`LLM Gate "${construct.node.path}" condition not met: score ${score} is ${passesThreshold ? 'in' : 'out of'} range`);
        }
      } else if (construct.props.condition.type === 'pass_if_regex_matches' || construct.props.condition.type === 'fail_if_regex_matches') {
        // For regex conditions, we don't need structured output... but we're going to use it anyway for a simpler interface
        const result = yield* getStructuredOutputFromTask(ctx, construct.props.condition.structuredOutput, query)
        const content = result.output.analysis;
        
        // Check if the regex matches
        const regex = new RegExp(construct.props.condition.regex);
        const matches = regex.test(content);
        
        // Determine if we passed based on the condition type
        const passed = construct.props.condition.type === 'pass_if_regex_matches' ? matches : !matches;
        
        // If we didn't pass, throw an exception
        if (!passed) {
          throw new Error(`LLM Gate "${construct.node.path}" condition not met: regex ${matches ? 'matched' : 'did not match'}`);
        }
      }

      // If we succeed in passing, the gate is invisible and should add nothing to the messages
      const output: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> = {
        messages: ctx.input.messages
      };

      // Return the final result with the original messages
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

/**
 * Helper function to get the prompt for the LLM gate
 */
function* getPrompt(construct: LLMGate, ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
  if (typeof construct.props.prompt === "string") {
    return construct.props.prompt;
  } else {
    const formattedPrompt = yield* getTaskCall(ctx, construct.props.prompt)({
      data: {}
    });
    return formattedPrompt.output.result;
  }
}
