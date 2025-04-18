import { z } from 'zod';
import axios from 'axios';
import { AGENT_CONTEXT_TASK_DEF, AgentContext } from '@ferment-ai/core-constructs-lib';
import { getTaskCall, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';


export function createAgentContextTaskImpl(construct: AgentContext): TaskImpl<typeof AGENT_CONTEXT_TASK_DEF.inputType, typeof AGENT_CONTEXT_TASK_DEF.outputType> {
  return {
    def: AGENT_CONTEXT_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof AGENT_CONTEXT_TASK_DEF.inputType, typeof AGENT_CONTEXT_TASK_DEF.outputType>) {
      console.log(`Executing AgentContext: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const toolRes = yield* getTaskCall(ctx, construct.props.model)({
        messages: construct.props.initialMessages
      });

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          response: `Response from prompt task ${construct.node.id}`,
        }
      };
    }
  };
}