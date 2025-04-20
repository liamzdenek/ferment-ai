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

        // Unified regex to match all tag types (tool, prompt, resource)
        // This matches <type:name>content</any-tag> pattern
        // Using non-greedy matching (?:(?!<\/).)*? to avoid capturing across multiple tags
        const tagRegex = /<(tool|prompt|resource):([^>]+)>((?:(?!<\/).)*?)<\/[^>]*>/gs;
        let match;

        while ((match = tagRegex.exec(content)) !== null) {
          const tagType = match[1]; // tool, prompt, or resource
          const fullName = match[2];
          const contentStr = match[3].trim();
          
          // Strip the prefix if present
          const name = fullName.includes(':') ? fullName.split(':')[1] : fullName;
          
          try {
            if (tagType === 'resource') {
              // Resources have URI content, not JSON
              executionRequests.push({
                type: 'resource',
                name,
                uri: contentStr
              });
              console.log(`Found resource invocation: ${fullName} -> ${name}`);
            } else {
              // For tool and prompt, parse JSON content
              const args = JSON.parse(contentStr);
              executionRequests.push({
                type: tagType,
                name,
                arguments: args
              });
              console.log(`Found ${tagType} invocation: ${fullName} -> ${name}`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error parsing ${tagType} content for ${name}: ${errorMessage}`);
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