import { CapableWorkflowTaskMessageSchema, FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF, RENDER_TEMPLATE_TASK_DEF, TagCapabilityParserFormatPromptTask, TagCapabilityParserParseModelResponseTask } from "@ferment-ai/core-constructs-lib";
import { getTaskCall, TaskImpl, TaskCtx } from "@ferment-ai/runtime-common";
import * as z from 'zod';

export function createTagCapabilityParserFormatPromptTask(construct: TagCapabilityParserFormatPromptTask): TaskImpl<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
  return {
    def: FORMAT_PROMPT_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>) {
      interface TemplateToolType {
        name: string;
        description?: string;
        parameters?: any;
      }

      // Type assertion for availableCapabilities
      const availableCapabilities = ctx.input.availableCapabilities as {
        tools: { name: string; description?: string; inputSchema: any }[];
        prompts: { name: string; description?: string; arguments: any }[];
        resources: { name: string; description?: string }[];
      };

      const tools: TemplateToolType[] = [
        ...availableCapabilities.tools.map(tool => ({
          name: `tool:${tool.name}`,
          description: tool.description ?? "",
          parameters: tool.inputSchema
        })),

        ...availableCapabilities.prompts.map(prompt => ({
          name: `prompt:${prompt.name}`,
          description: prompt.description ?? "",
          parameters: prompt.arguments
        })),

        ...availableCapabilities.resources.map(resources => ({
          name: `resource:${resources.name}`,
          description: resources.description ?? ""
        }))
      ]

      // Use the template parser to render the template
      const templateParser = construct.props.capabilityParser.props.templateParser;
      if (!templateParser) {
        throw new Error("No template parser provided");
      }
      
      const renderTemplateResult = yield* getTaskCall(ctx, templateParser)({
        data: { tools }
      });

      const res = renderTemplateResult.output.result;

      // Type assertion for messages
      const messages = ctx.input.messages as z.infer<typeof CapableWorkflowTaskMessageSchema>[];
      
      // Find the first message with the role "system"
      const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
      const updatedMessages = [...messages];
      
      if (systemMessageIndex === -1) {
        // If no system message exists, create one at the beginning
        updatedMessages.unshift({
          role: 'system',
          content: res
          // No category needed for system messages
        });
      } else {
        // Append res to the end of the existing system message with a header
        updatedMessages[systemMessageIndex] = {
          role: 'system',
          content: updatedMessages[systemMessageIndex].content + res
        };
      }

      console.log("Updated messages", updatedMessages);

      const output: z.infer<typeof FORMAT_PROMPT_TASK_DEF.outputType> = {
        prompt: {
          messages: updatedMessages
        }
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



export function createTagCapabilityParserParseModelResponseTask(construct: TagCapabilityParserParseModelResponseTask): TaskImpl<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  return {
    def: PARSE_MODEL_RESPONSE_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>) {
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