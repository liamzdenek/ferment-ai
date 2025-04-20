import { BaseCapability, CAPABLE_WORKFLOW_TASK_DEF, CapableModel, GET_AVAILABLE_CAPABILITIES_TASK_DEF, InvokeChatModelMessageSchema } from '@ferment-ai/core-constructs-lib';
import { getTaskCall, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import * as z from 'zod';


export function createCapableModelTask(construct: CapableModel): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      console.log(`Executing AgentContext: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      const availableCapabilities: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
        prompts: [],
        resources: [],
        tools: []
      }

      // Create mappings from capability names to their respective capabilities
      const toolNameToCapabilityMap = new Map<string, BaseCapability>();
      const promptNameToCapabilityMap = new Map<string, BaseCapability>();
      const resourceNameToCapabilityMap = new Map<string, BaseCapability>();

      for(const capability of construct.props.capabilities) {
        const capabilitiesRes = yield* getTaskCall(ctx, capability.getAvailableCapabilities)()

        // Check for conflicts with duplicate names within each list
        for (const prompt of capabilitiesRes.output.prompts) {
          if (availableCapabilities.prompts.some(p => p.name === prompt.name)) {
            throw new Error(`Duplicate prompt name detected: ${prompt.name}.`); // TODO: Rename, Blacklist, or Whitelist the tools.
          }
          promptNameToCapabilityMap.set(prompt.name, capability);
        }

        for (const resource of capabilitiesRes.output.resources) {
          if (availableCapabilities.resources.some(r => r.name === resource.name)) {
            throw new Error(`Duplicate resource name detected: ${resource.name}.`);
          }
          resourceNameToCapabilityMap.set(resource.name, capability);
        }

        for (const tool of capabilitiesRes.output.tools) {
          if (availableCapabilities.tools.some(t => t.name === tool.name)) {
            throw new Error(`Duplicate tool name detected: ${tool.name}.`);
          }
          toolNameToCapabilityMap.set(tool.name, capability);
        }

        // Add the capabilities after checking for duplicates
        availableCapabilities.prompts.push(...capabilitiesRes.output.prompts);
        availableCapabilities.resources.push(...capabilitiesRes.output.resources);
        availableCapabilities.tools.push(...capabilitiesRes.output.tools);
      }
      
      console.log("Got availableCapabilities", availableCapabilities);

      const formattedPrompt = yield* getTaskCall(ctx, construct.props.capabilityParser.formatPrompt)({
        messages: ctx.input.messages,
        availableCapabilities
      });

      const modelRes = yield* getTaskCall(ctx, construct.props.model)({
        messages: formattedPrompt.output.messages,
      });

      const toolRes = yield* getTaskCall(ctx, construct.props.capabilityParser.parseModelResponse)({
        availableCapabilities,
        messageHistory: ctx.input.messages,
        newMessages: modelRes.output.messages
      });

      console.log("Got tool invocation reqs", toolRes.output.executionRequests);

      // Maintain a list of messages for the conversation
      const conversationMessages = [...ctx.input.messages, ...modelRes.output.messages];
      
      // Separate prompt requests from other requests
      const promptRequests = toolRes.output.executionRequests.filter(req => req.type === 'prompt');
      const nonPromptRequests = toolRes.output.executionRequests.filter(req => req.type !== 'prompt');
      
      // Process non-prompt requests first
      for(const req of nonPromptRequests) {
        let capability;
        
        // Get the right capability based on the request type and name
        if (req.type === 'tool') {
          capability = toolNameToCapabilityMap.get(req.name);
        } else if (req.type === 'resource') {
          capability = resourceNameToCapabilityMap.get(req.name);
        }
        
        if (!capability) {
          console.error(`No capability found for ${req.type} with name ${req.name}`);
          continue;
        }

        const toolResult = yield* getTaskCall(ctx, capability.executeCapability)(req);
        
        // Add the tool result as a new message in the conversation
        conversationMessages.push({
          role: 'user',
          content: `Tool ${req.name} executed with result: ${JSON.stringify(toolResult.output)}`
        });
      }
      
      // Process prompt requests one at a time if any exist
      if (promptRequests.length > 0) {
        // Create a temporary conversation for the prompt chain
        let tempConversation = [...conversationMessages];
        
        // Execute each prompt capability one at a time
        for (const promptReq of promptRequests) {
          // Get the capability for this prompt
          const capability = promptNameToCapabilityMap.get(promptReq.name);
          
          if (!capability) {
            console.error(`No capability found for prompt with name ${promptReq.name}`);
            continue;
          }
          
          // Execute the prompt capability
          const promptResult = yield* getTaskCall(ctx, capability.executeCapability)(promptReq);
          
          // Create a temporary message with the prompt result
          const promptResultMessage: z.infer<typeof InvokeChatModelMessageSchema> = {
            role: 'assistant',
            content: `Prompt ${promptReq.name} executed with result: ${JSON.stringify(promptResult.output)}`
          };
          
          // Add the prompt result to the temporary conversation
          tempConversation.push(promptResultMessage);
          
          // Run the model with the updated temporary conversation
          const promptModelRes = yield* getTaskCall(ctx, construct.props.model)({
            messages: tempConversation,
          });
          
          // Update the temporary conversation with the model's response
          tempConversation = [...tempConversation, ...promptModelRes.output.messages];
        }
        
        // After all prompts are processed, add only the final model response to the conversation
        // Extract only the last message from the temporary conversation
        if (tempConversation.length > conversationMessages.length) {
          const newMessages = tempConversation.slice(conversationMessages.length);
          // Only add the last message from the prompt chain to the final conversation
          if (newMessages.length > 0) {
            conversationMessages.push(newMessages[newMessages.length - 1]);
          }
        }
      }

      const output: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> = {
        messages: conversationMessages
      }

      // Return the final result
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