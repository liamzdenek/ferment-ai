import { z } from 'zod';
import axios from 'axios';
import { AGENT_CONTEXT_TASK_DEF, AgentContext, INVOKE_MODEL_TASK_DEF, InvokeChatModelTaskInputSchema, InvokeChatModelTaskOutputSchema, OllamaModel } from '@ferment-ai/core-constructs-lib';
import { convertPromiseToGenerator, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';


export function createAgentContextTaskImpl(agentContext: AgentContext): TaskImpl<typeof AGENT_CONTEXT_TASK_DEF.inputType, typeof AGENT_CONTEXT_TASK_DEF.outputType> {
  return {
    def: AGENT_CONTEXT_TASK_DEF,
    taskId: agentContext.node.path,
    execute: async function*(ctx: TaskCtx<typeof AGENT_CONTEXT_TASK_DEF.inputType, typeof AGENT_CONTEXT_TASK_DEF.outputType>) {
      console.log(`Executing AgentContext: ${agentContext.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      agentContext.props.model

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        taskId: ctx.taskId,
        input: ctx.input,
        output: {
          response: `Response from prompt task ${agentContext.node.id}`,
          input: ctx.input
        }
      };
    }
  };
}