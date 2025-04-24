import { BaseCapability, CAPABLE_WORKFLOW_TASK_DEF, CapableModel, GET_AVAILABLE_CAPABILITIES_TASK_DEF, CapableWorkflowTaskMessageSchema, INVOKE_MODEL_TASK_DEF, BaseModel } from '@ferment-ai/core-constructs-lib';
import { getTaskCall, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import * as z from 'zod';

type CapabilityType = 'tool' | 'prompt' | 'resource';
type CapabilityMap = Map<CapabilityType, Map<string, BaseCapability>>;
type CapableWorkflowMessage = z.infer<typeof CapableWorkflowTaskMessageSchema>;

/**
 * Aggregates capabilities from all capability providers and creates mappings.
 */
async function* aggregateCapabilities(
  ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>,
  construct: CapableModel
) {
  const forceCapability = ctx.input.forceCapability;

  const availableCapabilities: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> = {
    prompts: [],
    resources: [],
    tools: []
  };

  // Initialize capability maps for each type
  const capabilityMap: CapabilityMap = new Map([
    ['tool', new Map()],
    ['prompt', new Map()],
    ['resource', new Map()]
  ]);

  // Process each capability provider
  for (const capability of construct.props.capabilities) {
    const capabilitiesRes = yield* getTaskCall(ctx, capability.getAvailableCapabilities)();
    
    // Check for conflicts with duplicate names
    for (const prompt of capabilitiesRes.output.prompts) {
      if (availableCapabilities.prompts.some(p => p.name === prompt.name)) {
        throw new Error(`Duplicate prompt name detected: ${prompt.name}.`);
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
  
  // If forceCapability is defined, filter the capabilities to only include that one
  if (forceCapability) {
    const { type, name, capabilityNodePath } = forceCapability;
    
    // Filter each capability type
    availableCapabilities.prompts = type === 'prompt'
      ? availableCapabilities.prompts.filter(p => p.name === name)
      : [];
      
    availableCapabilities.resources = type === 'resource'
      ? availableCapabilities.resources.filter(r => r.name === name)
      : [];
      
    availableCapabilities.tools = type === 'tool'
      ? availableCapabilities.tools.filter(t => t.name === name)
      : [];
    
    // Check if any matching capability was found
    const capabilityExists = (
      availableCapabilities.prompts.length > 0 ||
      availableCapabilities.resources.length > 0 ||
      availableCapabilities.tools.length > 0
    );
    
    // Throw error if capability doesn't exist
    if (!capabilityExists) {
      throw new Error(`Forced capability ${type}:${name} not found in available capabilities.`);
    }
    
    // Check if the capability provider matches the capabilityNodePath
    const forceCapabilityConstruct = capabilityMap.get(type)?.get(name);
    if (!forceCapabilityConstruct || forceCapabilityConstruct.node.path !== capabilityNodePath) {
      throw new Error(`Forced capability ${type}:${name} exists but with different path than ${capabilityNodePath}.`);
    }
  }
  
  return { availableCapabilities, capabilityMap, forceCapability };
}

/**
 * Adds category to messages
 */
function categorizeMessages(messages: CapableWorkflowMessage[], category: 'input' | 'intermediate' | 'response'): CapableWorkflowMessage[] {
  return messages.map(msg => ({
    ...msg,
    category
  }));
}

/**
 * Executes a capability and returns the result as a message
 */
async function* executeCapability(
  ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>,
  capability: BaseCapability,
  request: any
): AsyncGenerator<any, CapableWorkflowMessage> {
  const result = yield* getTaskCall(ctx, capability.executeCapability)(request);
  
  return {
    role: 'user' as const,
    content: `${request.type} ${request.name} executed with result: ${JSON.stringify(result.output.result)}`,
    category: 'intermediate' as const
  };
}

/**
 * Invokes the model and returns categorized messages
 */
async function* invokeModel(
  ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>,
  model: BaseModel,
  prompt: z.infer<typeof INVOKE_MODEL_TASK_DEF.inputType>
): AsyncGenerator<any, CapableWorkflowMessage[]> {
  const modelRes = yield* getTaskCall(ctx, model)(prompt);
  return categorizeMessages(modelRes.output.messages, 'response');
}

/**
 * Creates a task implementation for the CapableModel
 */
export function createCapableModelTask(construct: CapableModel): TaskImpl<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  return {
    def: CAPABLE_WORKFLOW_TASK_DEF,
    nodePath: construct.node.path,
    execute: async function* (ctx: TaskCtx<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType>) {
      // Aggregate capabilities from all capability providers
      const { forceCapability, availableCapabilities, capabilityMap } = yield* aggregateCapabilities(ctx, construct);

      // Initialize conversation with categorized input messages
      let conversation = categorizeMessages(ctx.input.messages, 'input');

      // Format prompt with capabilities and invoke model
      const formattedPrompt = yield* getTaskCall(ctx, construct.props.capabilityParser.formatPrompt)({
        messages: conversation,
        availableCapabilities,
        forceCapability
      });
      
      // Add model response to conversation
      const modelResponses = yield* invokeModel(ctx, construct.props.model, formattedPrompt.output.prompt);

      // Parse model response for capability requests
      const parseModelRes = (yield* getTaskCall(ctx, construct.props.capabilityParser.parseModelResponse)({
        availableCapabilities,
        messageHistory: ctx.input.messages,
        newMessages: modelResponses
      })).output;

      let executionRequests = parseModelRes.executionRequests;

      conversation = [...conversation, ...categorizeMessages(parseModelRes.newMessages, executionRequests.length === 0 ? 'response' : 'intermediate')];
      
      // Process capability requests until none remain
      while (executionRequests.length > 0) {
        // Sort requests to process prompts last
        executionRequests = [
          ...executionRequests.filter(req => req.type !== 'prompt'),
          ...executionRequests.filter(req => req.type === 'prompt')
        ];
        
        // Process each capability request
        for (const req of executionRequests) {
          const capability = capabilityMap.get(req.type as CapabilityType)?.get(req.name);
          
          if (!capability) {
            console.error(`No capability found for ${req.type} with name ${req.name}`);
            continue;
          }

          // Execute capability and add result to conversation
          const resultMessage = yield* executeCapability(ctx, capability, req);
          conversation.push(resultMessage);
          
          // For prompt capabilities, re-invoke the model without tools
          if (req.type === 'prompt') {
            const promptResponses = yield* invokeModel(ctx, construct.props.model, { messages: conversation });
            conversation = [...conversation, ...promptResponses];
          }
        }
        
        // Format prompt with updated conversation and invoke model again
        const formattedPrompt = yield* getTaskCall(ctx, construct.props.capabilityParser.formatPrompt)({
          messages: conversation,
          availableCapabilities,
          forceCapability
        });
        
        const newModelResponses = yield* invokeModel(ctx, construct.props.model, formattedPrompt.output.prompt);
        
        // Parse model response for new capability requests
        const capParser = (yield* getTaskCall(ctx, construct.props.capabilityParser.parseModelResponse)({
          availableCapabilities,
          messageHistory: conversation,
          newMessages: newModelResponses
        }))
        
        const msgs = capParser.output.newMessages ?? newModelResponses;
        executionRequests = capParser.output.executionRequests;

        conversation = [
          ...conversation.map(v => ({ ...v, category: v.category === 'response' ? 'intermediate' : v.category })),
          ...categorizeMessages(msgs, executionRequests.length === 0 ? 'response' : 'intermediate')
        ];
        
        console.log("Got tool invocation reqs", executionRequests);
      }
      
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        nodePath: ctx.nodePath,
        input: ctx.input,
        output: { messages: conversation }
      };
    }
  };
}