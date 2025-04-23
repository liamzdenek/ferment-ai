import { CapableWorkflowTaskMessageSchema, FORMAT_PROMPT_TASK_DEF, GET_AVAILABLE_CAPABILITIES_TASK_DEF, CapableWorkflowForceCapability, InvokeChatModelMessageSchema, PARSE_MODEL_RESPONSE_TASK_DEF, StructuredOutputCapabilityParserFormatPromptTask, StructuredOutputCapabilityParserParseModelResponseTask } from "@ferment-ai/core-constructs-lib";
import { getTaskCall, TaskImpl, TaskCtx } from "@ferment-ai/runtime-common";
import * as z from 'zod';

// Function to generate JSON schema based on available capabilities
function generateJsonSchema(
  availableCapabilities: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>,
  allowMultipleToolUses: boolean,
  forceCapability: z.infer<typeof CapableWorkflowForceCapability> | undefined
) {
  // Create a discriminated union with a discrete entry for each tool, prompt, resource, and message
  const oneOfSchemas = [];
  
  if(!forceCapability) {
    // Add message schema
    oneOfSchemas.push({
      type: "object",
      properties: {
        action: { type: "string", enum: ["message"] },
        content: { type: "string" }
      },
      required: ["action", "content"],
      additionalProperties: false
    });
  }
  
  // Add tool schemas - one for each tool
  availableCapabilities.tools.forEach(tool => {
    console.log("INPUT SCHEMA", tool.inputSchema);
    oneOfSchemas.push({
      type: "object",
      properties: {
        action: { type: "string", enum: ["tool"] },
        name: { type: "string", enum: [tool.name] },
        arguments: tool.inputSchema
      },
      required: ["action", "name", "arguments"],
      additionalProperties: false
    });
  });
  
  // Add prompt schemas - one for each prompt
  availableCapabilities.prompts.forEach(prompt => {
    console.log("ARGUMENTS:", prompt.arguments);
    
    // Convert prompt arguments to JSON schema
    const argProperties: Record<string, any> = {};
    const requiredArgs: string[] = [];
    
    if (Array.isArray(prompt.arguments)) {
      prompt.arguments.forEach((arg: { name: string, required?: boolean }) => {
        argProperties[arg.name] = { type: "string" };
        if (arg.required) {
          requiredArgs.push(arg.name);
        }
      });
    }
    
    oneOfSchemas.push({
      type: "object",
      properties: {
        action: { type: "string", enum: ["prompt"] },
        name: { type: "string", enum: [prompt.name] },
        arguments: {
          type: "object",
          properties: argProperties,
          required: requiredArgs.length > 0 ? requiredArgs : undefined
        }
      },
      required: ["action", "name", "arguments"],
      additionalProperties: false
    });
  });
  
  // Add resource schemas - one for each resource
  availableCapabilities.resources.forEach(resource => {
    oneOfSchemas.push({
      type: "object",
      properties: {
        action: { type: "string", enum: ["resource"] },
        name: { type: "string", enum: [resource.name] },
        uri: { type: "string", enum: [resource.uri] }
      },
      required: ["action", "name", "uri"],
      additionalProperties: false
    });
  });
  
  // Create the base schema with the oneOf discriminated union
  const baseActionSchema: any = {
    oneOf: oneOfSchemas
  };

  // Create the final schema based on allowMultipleToolUses
  if (allowMultipleToolUses) {
    return {
      type: "array",
      items: baseActionSchema
    };
  } else {
    return baseActionSchema;
  }
}

export function createStructuredOutputCapabilityParserFormatPromptTask(construct: StructuredOutputCapabilityParserFormatPromptTask): TaskImpl<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
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
      const availableCapabilities = ctx.input.availableCapabilities;

      const forceCapability = ctx.input.forceCapability;

      const tools: TemplateToolType[] = [
        ...availableCapabilities.tools.map(tool => ({
          name: tool.name,
          description: tool.description ?? "",
          parameters: tool.inputSchema
        })),

        ...availableCapabilities.prompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description ?? "",
          parameters: prompt.arguments
        })),

        ...availableCapabilities.resources.map(resources => ({
          name: resources.name,
          description: resources.description ?? ""
        }))
      ];

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

      // Generate the appropriate JSON schema based on allowMultipleToolUses flag
      const allowMultipleToolUses = construct.props.capabilityParser.props.allowMultipleToolUses ?? false;
      const jsonSchema = generateJsonSchema(availableCapabilities, allowMultipleToolUses, forceCapability);

      // Add forceJsonSchema to the prompt options
      const output: z.infer<typeof FORMAT_PROMPT_TASK_DEF.outputType> = {
        prompt: {
          messages: updatedMessages,
          forceJsonSchema: jsonSchema
        }
      };

      console.log("Updated messages with JSON schema", JSON.stringify(output));

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

export function createStructuredOutputCapabilityParserParseModelResponseTask(construct: StructuredOutputCapabilityParserParseModelResponseTask): TaskImpl<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  return {
    def: PARSE_MODEL_RESPONSE_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>) {
      // Extract all execution requests from the new messages
      const executionRequests = [];
      const newMessages: z.infer<typeof InvokeChatModelMessageSchema>[] = [];

      // Process each new message
      for (const message of ctx.input.newMessages) {
        if (message.role !== 'assistant') {
          // Only parse assistant messages
          newMessages.push(message);
          continue;
        }

        const content = message.content;
        
        try {
          // Parse the JSON response
          const parsedContent = JSON.parse(content);
          
          // Check if we're expecting multiple tool uses
          const allowMultipleToolUses = construct.props.capabilityParser.props.allowMultipleToolUses ?? false;
          
          // Handle both single and multiple tool use cases
          const actions = allowMultipleToolUses && Array.isArray(parsedContent) 
            ? parsedContent 
            : [parsedContent];
          
          // Process each action
          for (const action of actions) {
            if (!action.action) {
              console.error("Action missing 'action' property:", action);
              continue;
            }
            
            switch (action.action) {
              case 'tool':
                if (!action.name || !action.arguments) {
                  console.error(`Tool action missing required properties (name: ${!!action.name}, arguments: ${!!action.arguments}):`, JSON.stringify(action));
                  continue;
                }
                executionRequests.push({
                  type: 'tool',
                  name: action.name,
                  arguments: action.arguments
                });
                newMessages.push({ ...message, content: message.content.trim() });
                console.log(`Found tool invocation: ${action.name}`);
                break;
                
              case 'prompt':
                if (!action.name || !action.arguments) {
                  console.error(`Prompt action missing required properties (name: ${!!action.name}, arguments: ${!!action.arguments}):`, JSON.stringify(action));
                  continue;
                }
                executionRequests.push({
                  type: 'prompt',
                  name: action.name,
                  arguments: action.arguments
                });
                newMessages.push({ ...message, content: message.content.trim() });
                console.log(`Found prompt invocation: ${action.name}`);
                break;
                
              case 'resource':
                if (!action.name || !action.uri) {
                  console.error(`Resource action missing required properties (name: ${!!action.name}, uri: ${!!action.uri}):`, JSON.stringify(action));
                  continue;
                }
                executionRequests.push({
                  type: 'resource',
                  name: action.name,
                  uri: action.uri
                });
                newMessages.push({ ...message, content: message.content.trim() });
                console.log(`Found resource invocation: ${action.name}`);
                break;
                
              case 'message':
                if (!action.content) {
                  console.error(`Message action missing 'content' property (content: ${!!action.content}):`, JSON.stringify(action));
                  continue;
                }
                // For message actions, we don't create an execution request
                // as they are just normal messages
                console.log(`Found message: ${action.content.substring(0, 50)}...`);
                newMessages.push({
                  ...message,
                  content: action.content
                });
                break;
                
              default:
                console.error(`Unknown action type: ${action.action}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error parsing JSON response: ${errorMessage}`);
          console.error(`Content: ${content}`);
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
          executionRequests,
          newMessages
        }
      };
    }
  };
}