import { RootConstruct } from 'constructs';
import type { Module } from '@ferment-ai/runtime-common';
import type { Journal } from '@ferment-ai/journal';
import { v4 as uuidv4 } from 'uuid';

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
  if (construct.constructor.name === 'AgentContext') {
    await processAgentContext(construct, journal);
  } else if (construct.constructor.name === 'VirtualModel') {
    await processVirtualModel(construct, journal);
  } else if (construct.constructor.name === 'Model') {
    await processModel(construct, journal);
  } else if (construct.constructor.name === 'Tool') {
    await processTool(construct, journal);
  } else if (construct.constructor.name === 'Entrypoint') {
    await processEntrypoint(construct, journal);
  } else if (construct.constructor.name === 'ExitPoint') {
    await processExitPoint(construct, journal);
  }
  // Only mark the construct as bound if it's a core construct
  if (construct.constructor.name === 'AgentContext' ||
      construct.constructor.name === 'VirtualModel' ||
      construct.constructor.name === 'Model' ||
      construct.constructor.name === 'Tool' ||
      construct.constructor.name === 'Entrypoint' ||
      construct.constructor.name === 'ExitPoint') {
    journal.markConstructAsBound(constructId);
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
    initialPayload: {}
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
  // Register the agent system
  journal.registerSystem({
    id: 'agent-system',
    eventTypes: ['agent_invoke', 'tool_result'],
    async execute(journal: Journal, event: any): Promise<void> {
      if (event.type === 'agent_invoke') {
        // Create a process to invoke the agent
        const agentId = event.payload.agentId;
        const agentComponent = journal.getComponent<any>(agentId, 'AgentComponent');
        if (agentComponent) {
          const process = {
            id: uuidv4(),
            type: 'AgentProcess',
            status: 'running' as const,
            agentId,
            input: event.payload.input,
            startTime: Date.now()
          };
          journal.createProcess(process);
          // Actual agent invocation would happen here
        }
      } else if (event.type === 'tool_result') {
        // Handle tool result
        // ...
      }
    }
  });
  
  // Register the tool system
  journal.registerSystem({
    id: 'tool-system',
    eventTypes: ['tool_invoke'],
    async execute(journal: Journal, event: any): Promise<void> {
      if (event.type === 'tool_invoke') {
        // Create a process to invoke the tool
        const toolId = event.payload.toolId;
        const toolComponent = journal.getComponent<any>(toolId, 'ToolComponent');
        if (toolComponent) {
          const process = {
            id: uuidv4(),
            type: 'ToolProcess',
            status: 'running' as const,
            toolId,
            input: event.payload.input,
            startTime: Date.now()
          };
          journal.createProcess(process);
          // Actual tool invocation would happen here
        }
      }
    }
  });
  
  // Register the entrypoint system
  journal.registerSystem({
    id: 'entrypoint-system',
    eventTypes: ['entrypoint_invoked'],
    async execute(journal: Journal, event: any): Promise<void> {
      if (event.type === 'entrypoint_invoked') {
        // Find the entrypoint entity
        const entrypointId = event.payload.entrypointId;
        const entrypointEntities = journal.getEntitiesWithComponent('EntrypointComponent');
        const entrypointEntity = entrypointEntities.find((entityId: string) => {
          const component = journal.getComponent<any>(entityId, 'EntrypointComponent');
          return component && component.id === entrypointId;
        });
        
        if (entrypointEntity) {
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
            
            // Invoke the first agent in the virtual model
            // This would typically be determined by the virtual model's configuration
            // For now, we'll just use a placeholder
            journal.publish('agent_invoke', 'entrypoint-system', {
              agentId: 'placeholder-agent-id',
              input: event.payload.initialPayload
            });
          }
        }
      }
    }
  });
}