import { EXECUTE_CAPABILITY_TASK_DEF, GET_AVAILABLE_CAPABILITIES_TASK_DEF, STRUCTURED_OUTPUT_TASK_DEF, StructuredOutput, StructuredOutputCapabilityError, StructuredOutputCapabilityExecuteCapability, StructuredOutputCapabilityGetAvailableCapabilities } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall } from "@ferment-ai/runtime-common";
import * as z from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

export function createStructuredOutputTask(construct: StructuredOutput<z.ZodUnknown>): TaskImpl<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType, typeof STRUCTURED_OUTPUT_TASK_DEF.outputType> {
  return {
    def: STRUCTURED_OUTPUT_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType, typeof STRUCTURED_OUTPUT_TASK_DEF.outputType>) {

      let data: z.infer<typeof construct.props.outputType>;
      try {
        const _linkRes = yield* getTaskCall(ctx, construct.props.capableTask)({
          messages: ctx.input.messages,
          forceCapability: {
            capabilityNodePath: construct.structuredOutputCapability.node.path,
            type: 'tool',
            name: 'structured_output', // construct.props.
          }
        });

        throw new Error(`Unexpected model return; expected it to invoke the StructuredOutputCapability. Returning messages normally is not supported by StructuredOutputs. CapableTask=${construct.props.capableTask.node.path}`);
      } catch (e) {
        if(!(e instanceof StructuredOutputCapabilityError)) {
          throw e;
        }
        data = construct.props.outputType.parse(e.structuredData);
      }
 
      const output: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.outputType> = {
        messages: ctx.input.messages,
        structuredOutput: data
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


export function createStructuredOutputCapabilityGetCapabilitiesTask(construct: StructuredOutputCapabilityGetAvailableCapabilities): TaskImpl<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> {
  return {
    def: GET_AVAILABLE_CAPABILITIES_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>) {

      // If we succeed in passing, the gate is invisible and should add nothing to the messages
      const output: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
        tools: [{
          name: "structured_output",
          //description?: string | undefined;
          inputSchema: zodToJsonSchema(construct.props.parentConstruct.props.asType)
        }],
        prompts: [],
        resources: [],
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
  }
}


export function createStructuredOutputCapabilityExecuteCapabilityTask(construct: StructuredOutputCapabilityExecuteCapability): TaskImpl<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType> {
  return {
    def: EXECUTE_CAPABILITY_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>) {

      const i = ctx.input;

      if(i.type !== "tool") {
        throw new Error("StructuredOutputCapabilityExecuteCapability can only handle tool invocations")
      }

      throw new StructuredOutputCapabilityError("Passing up the structured output", {}, i.arguments);
    }
  }
}