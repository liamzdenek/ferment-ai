import { RootConstruct } from 'constructs';
import type { Module, Journal, System, SystemStateContext, Event } from '@ferment-ai/runtime-interfaces';
import { v4 as uuidv4 } from 'uuid';

// Event payload types
interface AgentInvokePayload {
  agentId: string;
  input: any;
}

interface ToolInvokePayload {
  toolId: string;
  input: any;
}

interface ToolResultPayload {
  toolId: string;
  processId: string;
  result: any;
}

interface EntrypointInvokedPayload {
  entrypointId: string;
  initialPayload: any;
}

// Type guards
function isAgentInvokePayload(payload: any): payload is AgentInvokePayload {
  return payload && 'agentId' in payload && 'input' in payload;
}

function isToolInvokePayload(payload: any): payload is ToolInvokePayload {
  return payload && 'toolId' in payload && 'input' in payload;
}

function isToolResultPayload(payload: any): payload is ToolResultPayload {
  return payload && 'toolId' in payload && 'processId' in payload && 'result' in payload;
}

function isEntrypointInvokedPayload(payload: any): payload is EntrypointInvokedPayload {
  return payload && 'entrypointId' in payload && 'initialPayload' in payload;
}

// Event type mapping
interface CoreConstructsEventPayloads {
  'agent_invoke': AgentInvokePayload;
  'tool_invoke': ToolInvokePayload;
  'tool_result': ToolResultPayload;
  'entrypoint_invoked': EntrypointInvokedPayload;
}

// System state types
interface AgentSystemState {
  activeAgents: Record<string, { lastInput: any; timestamp: number }>;
  pendingToolResults: Record<string, any>;
}

interface ToolSystemState {
  activeTools: Record<string, { lastInput: any; timestamp: number }>;
}

interface EntrypointSystemState {
  activeEntrypoints: Record<string, { timestamp: number }>;
}

/**
 * Creates a core constructs module
 * 
 * @returns A module for core constructs
 */
export function createCoreConstructsModule(): Module {
  return {
    id: 'CoreConstructs::CoreModule',
    version: '1.0.0',
    dependencies: [],
    
    async initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void> {
      // Create a set to track which constructs have been processed
      const processedConstructs = new Set<string>();
      
      // Process the construct tree
      await processConstruct(rootConstruct, journal, processedConstructs);
      
      // Register systems
      registerSystems(journal);
    }
  };
}

/**
 * Processes a construct and its children
 * 
 * @param construct The construct to process
 * @param journal The journal
 * @param processedConstructs A set of processed construct IDs
 */
async function processConstruct(
  construct: any,
  journal: Journal,
  processedConstructs: Set<string>
): Promise<void> {
  const constructId = construct.node.id;
  
  // Skip if already processed
  if (processedConstructs.has(constructId)) {
    return;
  }
  
  // Mark as processed
  processedConstructs.add(constructId);
  
  // Process based on construct type
  const constructType = (construct as any).constructType;
  console.log('Processing construct:', constructId, constructType);
  
  if (constructType && constructType.startsWith('CoreConstructs::')) {
    if (constructType === 'CoreConstructs::AgentContext') {
      await processAgentContext(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::VirtualModel' || constructType === 'CoreConstructs::TwoAgentModel') {
      await processVirtualModel(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Model' ||
               constructType === 'CoreConstructs::OpenAIModel' ||
               constructType === 'CoreConstructs::AnthropicModel') {
      await processModel(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Tool' ||
               constructType === 'CoreConstructs::SendEmailTool' ||
               constructType === 'CoreConstructs::ExitPointTool') {
      await processTool(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Entrypoint') {
      await processEntrypoint(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::ExitPoint') {
      await processExitPoint(construct, journal);
      journal.markConstructAsBound(constructId);
    }
  }
  
  
  // Process child constructs
  for (const child of construct.node.children) {
    await processConstruct(child, journal, processedConstructs);
  }
}

/**
 * Processes an agent context construct
 * 
 * @param agentContext The agent context construct
 * @param journal The journal
 */
async function processAgentContext(agentContext: any, journal: Journal): Promise<void> {
  // Create an entity for the agent
  const entityId = journal.createEntity();
  
  // Add an AgentComponent
  journal.addComponent(entityId, 'AgentComponent', {
    type: 'AgentComponent',
    modelId: agentContext.model.node.id,
    prompt: agentContext.prompt,
    contextWindowSize: agentContext.contextWindowSize || 4000,
    tools: agentContext.tools.map((tool: any) => tool.node.id)
  });
}

/**
 * Processes a virtual model construct
 * 
 * @param virtualModel The virtual model construct
 * @param journal The journal
 */
async function processVirtualModel(virtualModel: any, journal: Journal): Promise<void> {
  // Create an entity for the virtual model
  const entityId = journal.createEntity();
  
  // Add a VirtualModelComponent
  journal.addComponent(entityId, 'VirtualModelComponent', {
    type: 'VirtualModelComponent',
    name: virtualModel.name,
    entrypointId: virtualModel.entrypoint?.node.id,
    exitPointId: virtualModel.exitPoint?.node.id
  });
}

/**
 * Processes a model construct
 * 
 * @param model The model construct
 * @param journal The journal
 */
async function processModel(model: any, journal: Journal): Promise<void> {
  // Create an entity for the model
  const entityId = journal.createEntity();
  
  // Add a ModelComponent
  journal.addComponent(entityId, 'ModelComponent', {
    type: 'ModelComponent',
    modelId: model.modelId,
    parameters: model.parameters || {}
  });
}

/**
 * Processes a tool construct
 * 
 * @param tool The tool construct
 * @param journal The journal
 */
async function processTool(tool: any, journal: Journal): Promise<void> {
  // Create an entity for the tool
  const entityId = journal.createEntity();
  
  // Add a ToolComponent
  journal.addComponent(entityId, 'ToolComponent', {
    type: 'ToolComponent',
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ? JSON.stringify(tool.toJsonSchema().input_schema) : undefined,
    outputSchema: tool.outputSchema ? JSON.stringify(tool.toJsonSchema().output_schema) : undefined
  });
  
  // Add specific component based on tool type
  if (tool.constructor.name === 'SendEmailTool') {
    journal.addComponent(entityId, 'SendEmailToolComponent', {
      type: 'SendEmailToolComponent',
      targetAgentId: tool.getTargetAgent().node.id
    });
  } else if (tool.constructor.name === 'ExitPointTool') {
    journal.addComponent(entityId, 'ExitPointToolComponent', {
      type: 'ExitPointToolComponent',
      exitPointId: tool.getExitPoint().node.id
    });
  }
}

/**
 * Processes an entrypoint construct
 * 
 * @param entrypoint The entrypoint construct
 * @param journal The journal
 */
async function processEntrypoint(entrypoint: any, journal: Journal): Promise<void> {
  // Create an entity for the entrypoint
  const entityId = journal.createEntity();
  
  // Add an EntrypointComponent
  journal.addComponent(entityId, 'EntrypointComponent', {
    type: 'EntrypointComponent',
    id: entrypoint.node.id,
    initialPayload: {} // This will be overridden by the execute method's initialPayload parameter
  });
}

/**
 * Processes an exit point construct
 * 
 * @param exitPoint The exit point construct
 * @param journal The journal
 */
async function processExitPoint(exitPoint: any, journal: Journal): Promise<void> {
  // Create an entity for the exit point
  const entityId = journal.createEntity();
  
  // Add an ExitPointComponent
  journal.addComponent(entityId, 'ExitPointComponent', {
    type: 'ExitPointComponent',
    id: exitPoint.node.id,
    exitMessage: exitPoint.getExitMessage()
  });
}

/**
 * Registers systems with the journal
 * 
 * @param journal The journal
 */
function registerSystems(journal: Journal): void {
  // Define the agent system
  const agentSystem: System<CoreConstructsEventPayloads, AgentSystemState> = {
    id: 'agent-system',
    eventTypes: ['agent_invoke', 'tool_result'],
    initialState: {
      activeAgents: {},
      pendingToolResults: {}
    },
    async execute(journal: Journal, event, stateContext) {
      // Get the current state
      const state = stateContext.getState();
      
      if (event.type === 'agent_invoke' && isAgentInvokePayload(event.payload)) {
        // Create a process to invoke the agent
        const { agentId, input } = event.payload;
        console.log('Agent system received input for agent:', agentId, input);
        const agentComponent = journal.getComponent<any>(agentId, 'AgentComponent');
        if (agentComponent) {
          // Update state to track this agent
          state.activeAgents[agentId] = {
            lastInput: input,
            timestamp: Date.now()
          };
          stateContext.setState(state);
          
          const process = {
            id: uuidv4(),
            type: 'AgentProcess',
            status: 'running' as const,
            agentId,
            input,
            startTime: Date.now()
          };
          journal.createProcess(process);
          
          // Simulate agent invocation with a delay
          setTimeout(() => {
            // Complete the process
            journal.completeProcess(process.id, {
              success: true,
              data: { output: `Agent ${agentId} processed input: ${JSON.stringify(input)}` }
            });
            
            // Update state
            const currentState = stateContext.getState();
            delete currentState.activeAgents[agentId];
            stateContext.setState(currentState);
            
            // Invoke a tool
            journal.publish('tool_invoke', 'agent-system', {
              toolId: 'tool1',
              input: { message: 'Hello from agent' }
            });
          }, 1000);
        }
      } else if (event.type === 'tool_result' && isToolResultPayload(event.payload)) {
        // Handle tool result
        const { toolId, processId, result } = event.payload;
        
        // Check if we're waiting for this tool result
        if (state.pendingToolResults[processId]) {
          // Process the result
          // ...
          
          // Update state
          delete state.pendingToolResults[processId];
          stateContext.setState(state);
        }
      }
    }
  };
  
  // Define the tool system
  const toolSystem: System<CoreConstructsEventPayloads, ToolSystemState> = {
    id: 'tool-system',
    eventTypes: ['tool_invoke'],
    initialState: {
      activeTools: {}
    },
    async execute(journal: Journal, event, stateContext) {
      // Get the current state
      const state = stateContext.getState();
      
      if (event.type === 'tool_invoke' && isToolInvokePayload(event.payload)) {
        // Create a process to invoke the tool
        const { toolId, input } = event.payload;
        const toolComponent = journal.getComponent<any>(toolId, 'ToolComponent');
        if (toolComponent) {
          // Update state to track this tool
          state.activeTools[toolId] = {
            lastInput: input,
            timestamp: Date.now()
          };
          stateContext.setState(state);
          
          const process = {
            id: uuidv4(),
            type: 'ToolProcess',
            status: 'running' as const,
            toolId,
            input,
            startTime: Date.now()
          };
          journal.createProcess(process);
          
          // Simulate tool execution with a delay
          setTimeout(() => {
            // Complete the process
            journal.completeProcess(process.id, {
              success: true,
              data: { result: `Tool ${toolId} processed input: ${JSON.stringify(input)}` }
            });
            
            // Update state
            const currentState = stateContext.getState();
            delete currentState.activeTools[toolId];
            stateContext.setState(currentState);
            
            // Publish result
            journal.publish('tool_result', 'tool-system', {
              toolId,
              processId: process.id,
              result: { output: `Tool ${toolId} processed input: ${JSON.stringify(input)}` }
            });
          }, 1000);
        }
      }
    }
  };
  
  // Define the entrypoint system
  const entrypointSystem: System<CoreConstructsEventPayloads, EntrypointSystemState> = {
    id: 'entrypoint-system',
    eventTypes: ['entrypoint_invoked'],
    initialState: {
      activeEntrypoints: {}
    },
    async execute(journal: Journal, event, stateContext) {
      // Get the current state
      const state = stateContext.getState();
      
      if (event.type === 'entrypoint_invoked' && isEntrypointInvokedPayload(event.payload)) {
        // Find the entrypoint entity
        const { entrypointId, initialPayload } = event.payload;
        console.log('Entrypoint system received initialPayload:', initialPayload);
        const entrypointEntities = journal.getEntitiesWithComponent('EntrypointComponent');
        const entrypointEntity = entrypointEntities.find((entityId: string) => {
          const component = journal.getComponent<any>(entityId, 'EntrypointComponent');
          return component && component.id === entrypointId;
        });
        
        if (entrypointEntity) {
          // Update state to track this entrypoint
          state.activeEntrypoints[entrypointId] = {
            timestamp: Date.now()
          };
          stateContext.setState(state);
          
          // Find the virtual model that contains this entrypoint
          const virtualModelEntities = journal.getEntitiesWithComponent('VirtualModelComponent');
          const virtualModelEntity = virtualModelEntities.find((entityId: string) => {
            const component = journal.getComponent<any>(entityId, 'VirtualModelComponent');
            return component && component.entrypointId === entrypointId;
          });
          
          if (virtualModelEntity) {
            // Get the virtual model component
            const virtualModelComponent = journal.getComponent<any>(virtualModelEntity, 'VirtualModelComponent');
            
            // Create a process to start the virtual model
            const process = {
              id: uuidv4(),
              type: 'VirtualModelProcess',
              status: 'running' as const,
              virtualModelId: virtualModelEntity,
              entrypointId,
              startTime: Date.now()
            };
            journal.createProcess(process);
            
            // Find an agent to invoke
            const agentEntities = journal.getEntitiesWithComponent('AgentComponent');
            if (agentEntities.length > 0) {
              // For now, just use the first agent
              const agentId = agentEntities[0];
              
              // Invoke the agent
              journal.publish('agent_invoke', 'entrypoint-system', {
                agentId,
                input: initialPayload
              });
            } else {
              // No agents found, complete the process with an error
              journal.failProcess(process.id, new Error('No agents found'));
              
              // Update state
              const currentState = stateContext.getState();
              delete currentState.activeEntrypoints[entrypointId];
              stateContext.setState(currentState);
            }
          }
        }
      }
    }
  };
  
  // Register the systems
  journal.registerSystem(agentSystem);
  journal.registerSystem(toolSystem);
  journal.registerSystem(entrypointSystem);
}