import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Journal, System } from '@ferment-ai/runtime-interfaces';
import {
  useState,
  useEffect,
  useEventCallback,
  useOnUnmountCallback,
  createEventType,
  useProcessManager
} from '@ferment-ai/runtime-hooks';

// Define event types
export const AGENT_INVOKE_EVENT = createEventType('agent_invoke', z.object({
  agentId: z.string(),
  input: z.any()
}));

// Import from tool module
import { TOOL_RESULT_EVENT } from '../tool/tool.js';

// Define the agent system
export const agentSystem: System = {
  id: 'agent-system',
  
  mount(journal: Journal) {
    // Create a process manager
    const pm = useProcessManager();
    
    // State for active agents
    const [activeAgents, setActiveAgents] = useState<Record<string, { lastInput: any; timestamp: number }>>({});
    
    // State for pending tool results
    const [pendingToolResults, setPendingToolResults] = useState<Record<string, any>>({});
    
    // Handle agent invoke events
    const v = useEventCallback(AGENT_INVOKE_EVENT)((event) => {
      const { agentId, input } = event.payload;
      console.log('Agent system received input for agent:', agentId, input);
      
      const agentComponent = journal.getComponent<any>(agentId, 'AgentComponent');
      if (agentComponent) {
        // Update state to track this agent
        setActiveAgents({
          ...activeAgents,
          [agentId]: {
            lastInput: input,
            timestamp: Date.now()
          }
        });
        
        // Create a process
        const processId = uuidv4();
        const process = {
          id: processId,
          type: 'AgentProcess',
          status: 'running' as const,
          agentId,
          input,
          startTime: Date.now(),
          sourceSystemId: 'agent-system'
        };
        
        journal.createProcess(process);
        
        // Attach the process to this system
        pm.attachProcess(processId);
        
        // Simulate agent invocation with a delay
        setTimeout(() => {
          // Complete the process
          journal.completeProcess(processId, {
            success: true,
            data: { output: `Agent ${agentId} processed input: ${JSON.stringify(input)}` }
          });
          
          // Update state
          const newActiveAgents = { ...activeAgents };
          delete newActiveAgents[agentId];
          setActiveAgents(newActiveAgents);
          
          // Invoke a tool
          journal.publish('tool_invoke', 'agent-system', {
            toolId: 'tool1',
            input: { message: 'Hello from agent' }
          });
        }, 1000);
      }
    });
    
    // Handle tool result events
    useEventCallback(TOOL_RESULT_EVENT)((event) => {
      const { toolId, processId, result } = event.payload;
      
      // Check if we're waiting for this tool result
      if (pendingToolResults[processId]) {
        // Process the result
        console.log(`Received result from tool ${toolId}:`, result);
        
        // Update state
        const newPendingToolResults = { ...pendingToolResults };
        delete newPendingToolResults[processId];
        setPendingToolResults(newPendingToolResults);
      }
    });
    
    // Clean up on unmount
    useOnUnmountCallback(() => {
      console.log('Agent system unmounting');
    });
  }
};

/**
 * Processes an agent context construct
 * 
 * @param agentContext The agent context construct
 * @param journal The journal
 */
export async function processAgentContext(agentContext: any, journal: Journal): Promise<void> {
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