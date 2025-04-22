import { CAPABLE_WORKFLOW_TASK_DEF, Chain } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx, getTaskCall } from "@ferment-ai/runtime-common";
import * as z from 'zod';

export function createChainTask(construct: Chain): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {

      let request: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        ...ctx.input
      }

      for(const link of construct.props.links) {
        //console.log("CALLING LINK ", link.node.path, "WITH INPUT", request);
        const linkRes = yield* getTaskCall(ctx, link)(request);
        
        request = { ...request, ...linkRes.output };
      }

      const output: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> = {
        messages: request.messages
      } 

      // Return the final result with the updated messages
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