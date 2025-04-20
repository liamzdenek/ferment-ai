import { BaseCapability, CAPABLE_WORKFLOW_TASK_DEF, CapableModel, GET_AVAILABLE_CAPABILITIES_TASK_DEF, InvokeChatModelMessageSchema } from '@ferment-ai/core-constructs-lib';
import { getTaskCall, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import * as z from 'zod';


/**
 * Aggregates capabilities from all capability providers and creates mappings from capability names to their respective capabilities.
 *
 * @param ctx The task context
 * @param construct The CapableModel construct
 * @returns An object containing available capabilities and mappings from capability names to their respective capabilities
 */
async function* aggregateCapabilities(
  ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>,
  construct: CapableModel
) {
  const availableCapabilities: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
    prompts: [],
    resources: [],
    tools: []
  };

  // Create a map of maps for capability types to capability names to their respective capabilities
  const capabilityMap = new Map<string, Map<string, BaseCapability>>();
  
  // Initialize maps for each capability type
  capabilityMap.set('tool', new Map<string, BaseCapability>());
  capabilityMap.set('prompt', new Map<string, BaseCapability>());
  capabilityMap.set('resource', new Map<string, BaseCapability>());

  for(const capability of construct.props.capabilities) {
    const capabilitiesRes = yield* getTaskCall(ctx, capability.getAvailableCapabilities)();

    // Check for conflicts with duplicate names within each list
    for (const prompt of capabilitiesRes.output.prompts) {
      if (availableCapabilities.prompts.some(p => p.name === prompt.name)) {
        throw new Error(`Duplicate prompt name detected: ${prompt.name}.`); // TODO: Rename, Blacklist, or Whitelist the tools.
      }
      capabilityMap.get('prompt')?.set(prompt.name, capability);
    }

    for (const resource of capabilitiesRes.output.resources) {
      if (availableCapabilities.resources.some(r => r.name === resource.name)) {
        throw new Error(`Duplicate resource name detected: ${resource.name}.`);
      }
      capabilityMap.get('resource')?.set(resource.name, capability);
    }

    for (const tool of capabilitiesRes.output.tools) {
      if (availableCapabilities.tools.some(t => t.name === tool.name)) {
        throw new Error(`Duplicate tool name detected: ${tool.name}.`);
      }
      capabilityMap.get('tool')?.set(tool.name, capability);
    }

    // Add the capabilities after checking for duplicates
    availableCapabilities.prompts.push(...capabilitiesRes.output.prompts);
    availableCapabilities.resources.push(...capabilitiesRes.output.resources);
    availableCapabilities.tools.push(...capabilitiesRes.output.tools);
  }
  
  console.log("Got availableCapabilities", availableCapabilities);
  
  return {
    availableCapabilities,
    capabilityMap
  };
}

export function createCapableModelTask(construct: CapableModel): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      console.log(`Executing AgentContext: ${construct.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);

      // Aggregate capabilities from all capability providers
      const {
        availableCapabilities,
        capabilityMap
      } = yield* aggregateCapabilities(ctx, construct);

      const formattedPrompt = yield* getTaskCall(ctx, construct.props.capabilityParser.formatPrompt)({
        messages: ctx.input.messages,
        availableCapabilities
      });

      const modelRes = yield* getTaskCall(ctx, construct.props.model)({
        messages: formattedPrompt.output.messages,
      });

      let toolRes = yield* getTaskCall(ctx, construct.props.capabilityParser.parseModelResponse)({
        availableCapabilities,
        messageHistory: ctx.input.messages,
        newMessages: modelRes.output.messages
      });

      console.log("Got tool invocation reqs", toolRes.output.executionRequests);
      
      // Maintain a list of messages for the conversation
      let conversationMessages = [...ctx.input.messages, ...modelRes.output.messages];
      
      // Continue looping as long as the model keeps producing tool, resource, or prompt invocations
      let hasCapabilityInvocations = toolRes.output.executionRequests.length > 0;
      
      while (hasCapabilityInvocations) {
        // Process all capability requests from the current model response
        let executionRequests = toolRes.output.executionRequests;
        hasCapabilityInvocations = false; // Reset for this iteration
        
        // Sort execution requests so that prompts go last
        executionRequests = [
          ...executionRequests.filter(req => req.type !== 'prompt'),
          ...executionRequests.filter(req => req.type === 'prompt')
        ];
        
        // Process each capability request
        for (const req of executionRequests) {
          // Get the right capability based on the request type and name
          const capability = capabilityMap.get(req.type)?.get(req.name);
          
          if (!capability) {
            console.error(`No capability found for ${req.type} with name ${req.name}`);
            continue;
          }

          // Execute the capability
          const capabilityResult = yield* getTaskCall(ctx, capability.executeCapability)(req);
          
          // Add the result as a new message in the conversation
          const resultMessage: z.infer<typeof InvokeChatModelMessageSchema> = {
            role: 'user',
            content: `${req.type} ${req.name} executed with result: ${JSON.stringify(capabilityResult.output.result)}`
          };
          
          conversationMessages.push(resultMessage);
          
          // For prompt capabilities, re-invoke the model without tools and append its response
          if (req.type === 'prompt') {
            // Run the model with the updated conversation
            const promptModelRes = yield* getTaskCall(ctx, construct.props.model)({
              messages: conversationMessages,
            });
            
            // Add the model's response to the conversation
            conversationMessages = [...conversationMessages, ...promptModelRes.output.messages];
          }
        }
        
        // If we processed any requests, check if the model produces more tool invocations
        if (executionRequests.length > 0) {
          // Format the prompt with available capabilities
          const formattedPrompt = yield* getTaskCall(ctx, construct.props.capabilityParser.formatPrompt)({
            messages: conversationMessages,
            availableCapabilities
          });
          
          // Invoke the model
          const newModelRes = yield* getTaskCall(ctx, construct.props.model)({
            messages: formattedPrompt.output.messages,
          });
          
          // Add the model's response to the conversation
          conversationMessages = [...conversationMessages, ...newModelRes.output.messages];
          
          // Parse the model response for tool invocations
          const newToolRes = yield* getTaskCall(ctx, construct.props.capabilityParser.parseModelResponse)({
            availableCapabilities,
            messageHistory: conversationMessages.slice(0, -newModelRes.output.messages.length),
            newMessages: newModelRes.output.messages
          });
          
          // Check if there are more tool invocations
          hasCapabilityInvocations = newToolRes.output.executionRequests.length > 0;
          
          // Update toolRes for the next iteration
          if (hasCapabilityInvocations) {
            toolRes = {
              ...newToolRes
            };
          }
          
          console.log("Got tool invocation reqs", toolRes.output.executionRequests);
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