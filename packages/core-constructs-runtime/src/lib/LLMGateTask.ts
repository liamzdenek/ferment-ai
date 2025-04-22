import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, CapableWorkflowTask, LLMGate } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall, TaskCallAndReturnRequest, TaskCallError, TaskCallResult } from "@ferment-ai/runtime-common";
import * as z from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Generic helper function to get structured output from a model
 * This function is similar to getTaskCall but adds structured output validation
 */
function* getStructuredOutput<T extends z.ZodType>(
  ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>,
  model: CapableModel,
  input: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType>,
  schema: T
): Generator<TaskCallAndReturnRequest, z.infer<T>, TaskCallResult | TaskCallError> {
  // Create a query with the force field for structured output
  const query: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
    ...input,
    force: {
      type: 'structuredOutput',
      schema: zodToJsonSchema(schema)
    }
  };

  console.log("Calling model with", query);

  // Call the model
  const modelResult = yield* getTaskCall(ctx, model)(query);
  
  console.log("Got structured output", modelResult.output.structuredOutput);
  
  // Validate the structured output against the schema
  try {
    return schema.parse(modelResult.output.structuredOutput);
  } catch (error) {
    throw new Error(`Invalid structured output: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createLlmGateTask(construct: LLMGate): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      const prompt = yield* getPrompt(construct, ctx);

      // Prepare the input with the prompt
      const input: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        messages: [
          ...ctx.input.messages,
          {
            role: "user",
            content: prompt
          }
        ]
      };

      // Handle different condition types
      if (construct.props.condition.type === 'pass_if_in_range' || construct.props.condition.type === 'fail_if_in_range') {
        const condition = construct.props.condition;
        
        // Define the schema for score validation
        const scoreSchema = z.strictObject({
          score: z.number()
            .min(condition.min)
            .max(condition.max)
        });
        
        // Get structured output with score validation
        const result = yield* getStructuredOutput(ctx, construct.props.model, input, scoreSchema);
        
        // Check if the score passes the condition (using gte/lte fields)
        const score = result.score;
        const passesThreshold = score >= condition.gte && score <= condition.lte;
        
        // Determine if we passed based on the condition type
        const passed = condition.type === 'pass_if_in_range' ? passesThreshold : !passesThreshold;
        
        // If we didn't pass, throw an exception
        if (!passed) {
          throw new Error(`LLM Gate "${construct.node.path}" condition not met: score ${score} is ${passesThreshold ? 'in' : 'out of'} range`);
        }
      } else if (construct.props.condition.type === 'pass_if_regex_matches' || construct.props.condition.type === 'fail_if_regex_matches') {
        // For regex conditions, we don't need structured output
        const modelResult = yield* getTaskCall(ctx, construct.props.model)(input);
        
        // Get the last message content
        const lastMessage = modelResult.output.messages[modelResult.output.messages.length - 1];
        const content = lastMessage.content;
        
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
