import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, GET_AVAILABLE_CAPABILITIES_TASK_DEF } from '@ferment-ai/core-constructs-lib';
import { getTaskCall, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import * as z from 'zod';


export function createCapableModelTask(construct: CapableModel): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      console.log(`Executing AgentContext: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const aggregateRes: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
        prompts: [],
        resources: [],
        tools: []
      }

      for(const capability of construct.props.capabilities) {
        const capabilitiesRes = yield* getTaskCall(ctx, capability.getAvailableCapabilities)()

        // TODO: check for conflicts with duplicate names. Names should be unique across all 3.
        aggregateRes.prompts.push(...capabilitiesRes.output.prompts);
        aggregateRes.resources.push(...capabilitiesRes.output.resources);
        aggregateRes.tools.push(...capabilitiesRes.output.tools);
      }
      
      console.log("Got aggregate res", aggregateRes);

      const toolRes = yield* getTaskCall(ctx, construct.props.model)({
        messages: ctx.input.messages,

      });

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          response: `Response from prompt task ${construct.node.id}`,
          toolRes
        }
      };
    }
  };
}