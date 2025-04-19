import { FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF, TagCapabilityParserFormatPromptTask, TagCapabilityParserParseModelResponseTask } from "@ferment-ai/core-constructs-lib";
import { TaskImpl, TaskCtx } from "@ferment-ai/runtime-common";
import dot from 'dot';

export function createTagCapabilityParserFormatPromptTask(construct: TagCapabilityParserFormatPromptTask): TaskImpl<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
  return {
    def: FORMAT_PROMPT_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>) {
      console.log(`Executing get available capabilities: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const engine = construct.props.tagCapabilityParser.props.promptTemplateEngine;
      if(engine != 'dot') {
        throw new Error("The template engine you provided doesn't exist or isn't supported. (only 'dot' is supported currently). You provided: "+engine);
      }

      console.log('got dot', dot);

      const tmpl = dot.template(construct.props.tagCapabilityParser.props.prompt, {
        ...dot.templateSettings,
        strip: false,
      });


      interface TemplateToolType {
        name: string;
        description?: string;
        parameters?: any;
      }

      const tools: TemplateToolType[] = [
        ...ctx.input.availableCapabilities.tools.map(tool => ({
          name: `tool:${tool.name}`,
          description: tool.description ?? "",
          parameters: tool.inputSchema
        })),

        ...ctx.input.availableCapabilities.prompts.map(prompt => ({
          name: `prompt:${prompt.name}`,
          description: prompt.description ?? "",
          parameters: prompt.arguments
        })),

        ...ctx.input.availableCapabilities.resources.map(resources => ({
          name: `resource:${resources.name}`,
          description: resources.description ?? ""
        }))
      ]

      const res = tmpl({
        tools
      })

      // Find the first message in ctx.input.messages with the role "system"
      const systemMessageIndex = ctx.input.messages.findIndex(msg => msg.role === 'system');
      const updatedMessages = [...ctx.input.messages];
      
      if (systemMessageIndex === -1) {
        // If no system message exists, create one at the beginning
        updatedMessages.unshift({
          role: 'system',
          content: res
        });
      } else {
        // Append res to the end of the existing system message with a header
        updatedMessages[systemMessageIndex] = {
          role: 'system',
          content: updatedMessages[systemMessageIndex].content + res
        };
      }

      console.log("Got template res", res);
      console.log("Updated messages", updatedMessages);

      // Return the final result with the updated messages
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          messages: updatedMessages
        }
      };
    }
  };
}



export function createTagCapabilityParserParseModelResponseTask(construct: TagCapabilityParserParseModelResponseTask): TaskImpl<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  return {
    def: PARSE_MODEL_RESPONSE_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>) {
      console.log(`Executing get available capabilities: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      throw new Error("Unimplemented");

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {}
      };
    }
  };
}