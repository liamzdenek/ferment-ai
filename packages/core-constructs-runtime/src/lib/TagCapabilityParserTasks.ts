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
      console.log(`Executing parse model response: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      // Extract all execution requests from the new messages
      const executionRequests = [];

      // Process each new message
      for (const message of ctx.input.newMessages) {
        if (message.role !== 'assistant') {
          // Only parse assistant messages
          continue;
        }

        const content = message.content;

        // Parse tool invocations: <tool:NAME>JSON</tool>
        const toolRegex = /<tool:([^>]+)>([^<]+)<\/tool>/g;
        let toolMatch;
        while ((toolMatch = toolRegex.exec(content)) !== null) {
          const fullToolName = toolMatch[1];
          const toolArgsStr = toolMatch[2];
          
          // Strip the prefix (tool:) if present
          const toolName = fullToolName.includes(':') ? fullToolName.split(':')[1] : fullToolName;
          
          try {
            const toolArgs = JSON.parse(toolArgsStr);
            executionRequests.push({
              type: 'tool',
              name: toolName,
              arguments: toolArgs
            });
            console.log(`Found tool invocation: ${fullToolName} -> ${toolName}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error parsing tool arguments for ${toolName}: ${errorMessage}`);
          }
        }

        // Parse prompt invocations: <prompt:NAME>JSON</prompt>
        const promptRegex = /<prompt:([^>]+)>([^<]+)<\/prompt>/g;
        let promptMatch;
        while ((promptMatch = promptRegex.exec(content)) !== null) {
          const fullPromptName = promptMatch[1];
          const promptArgsStr = promptMatch[2];
          
          // Strip the prefix (prompt:) if present
          const promptName = fullPromptName.includes(':') ? fullPromptName.split(':')[1] : fullPromptName;
          
          try {
            const promptArgs = JSON.parse(promptArgsStr);
            executionRequests.push({
              type: 'prompt',
              name: promptName,
              arguments: promptArgs
            });
            console.log(`Found prompt invocation: ${fullPromptName} -> ${promptName}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error parsing prompt arguments for ${promptName}: ${errorMessage}`);
          }
        }

        // Parse resource invocations: <resource:NAME>URI</resource>
        const resourceRegex = /<resource:([^>]+)>([^<]+)<\/resource>/g;
        let resourceMatch;
        while ((resourceMatch = resourceRegex.exec(content)) !== null) {
          const fullResourceName = resourceMatch[1];
          const resourceUri = resourceMatch[2].trim();
          
          // Strip the prefix (resource:) if present
          const resourceName = fullResourceName.includes(':') ? fullResourceName.split(':')[1] : fullResourceName;
          
          executionRequests.push({
            type: 'resource',
            name: resourceName,
            uri: resourceUri
          });
          console.log(`Found resource invocation: ${fullResourceName} -> ${resourceName}`);
        }

        // Alternative format for tool invocations: <function=NAME>JSON</function>
        const functionRegex = /<function=([^>]+)>([^<]+)<\/function>/g;
        let functionMatch;
        while ((functionMatch = functionRegex.exec(content)) !== null) {
          const fullToolName = functionMatch[1];
          const toolArgsStr = functionMatch[2];
          
          // Strip the prefix if present (though function format typically doesn't use prefixes)
          const toolName = fullToolName.includes(':') ? fullToolName.split(':')[1] : fullToolName;
          
          try {
            const toolArgs = JSON.parse(toolArgsStr);
            executionRequests.push({
              type: 'tool',
              name: toolName,
              arguments: toolArgs
            });
            console.log(`Found function invocation: ${fullToolName} -> ${toolName}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error parsing function arguments for ${toolName}: ${errorMessage}`);
          }
        }
      }

      console.log(`Found ${executionRequests.length} execution requests`);

      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: {
          executionRequests
        }
      };
    }
  };
}