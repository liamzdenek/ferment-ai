import { CAPABLE_WORKFLOW_TASK_DEF, CapableWorkflowTaskMessageSchema, EditMessagesTask } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx } from "@ferment-ai/runtime-common";
import * as z from 'zod';

export function createEditMessagesTask(construct: EditMessagesTask): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {

      let messages: z.infer<typeof CapableWorkflowTaskMessageSchema>[] = [];

      if(ctx.input.messages.length !== 0) {
        if(!construct.props.appendToLatestMessage) {
          messages = ctx.input.messages;
        } else {
          const lastIndex = ctx.input.messages.length - 1
          const earlierMsgs = ctx.input.messages.slice(0, lastIndex);
          const lastMsg = ctx.input.messages[lastIndex];

          messages = [
            ...earlierMsgs,
            {
              ...lastMsg,
              content: lastMsg.content + (lastMsg.content.endsWith("\n\n") ? "" : "\n\n") + construct.props.appendToLatestMessage
            }
          ]
        }
      }

      const newMessages = [
        ...(construct.props.messagesUnshift ?? []),
        ...messages,
        ...(construct.props.messagesPush ?? [])
      ];

      const output: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> = {
        ...ctx.input,
        messages: newMessages,
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