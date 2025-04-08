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
export const ENTRYPOINT_INVOKED_EVENT = createEventType('entrypoint_invoked', z.object({
  entrypointId: z.string(),
  initialPayload: z.any()
}));

// Define the entrypoint system
export const entrypointSystem: System = {
  id: 'entrypoint-system',
  
  mount(journal: Journal) {
    // Create a process manager
    const pm = useProcessManager();
    
    // State for active entrypoints
    const [activeEntrypoints, setActiveEntrypoints] = useState<Record<string, { timestamp: number }>>({});
    
    // Handle entrypoint invoked events
    useEventCallback(ENTRYPOINT_INVOKED_EVENT)((event) => {
      const { entrypointId, initialPayload } = event.payload;
      console.log('Entrypoint system received initialPayload:', initialPayload);
      
      // Find the entrypoint entity
      const entrypointEntities = journal.getEntitiesWithComponent('EntrypointComponent');
      const entrypointEntity = entrypointEntities.find((entityId: string) => {
        const component = journal.getComponent<any>(entityId, 'EntrypointComponent');
        return component && component.id === entrypointId;
      });
      
      if (entrypointEntity) {
        // Update state to track this entrypoint
        setActiveEntrypoints({
          ...activeEntrypoints,
          [entrypointId]: {
            timestamp: Date.now()
          }
        });
        
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
          const processId = uuidv4();
          const process = {
            id: processId,
            type: 'VirtualModelProcess',
            status: 'running' as const,
            virtualModelId: virtualModelEntity,
            entrypointId,
            startTime: Date.now(),
            sourceSystemId: 'entrypoint-system'
          };
          
          journal.createProcess(process);
          
          // Attach the process to this system
          pm.attachProcess(processId);
          
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
            journal.failProcess(processId, new Error('No agents found'));
            
            // Update state
            const newActiveEntrypoints = { ...activeEntrypoints };
            delete newActiveEntrypoints[entrypointId];
            setActiveEntrypoints(newActiveEntrypoints);
          }
        }
      }
    });
    
    // Clean up on unmount
    useOnUnmountCallback(() => {
      console.log('Entrypoint system unmounting');
    });
  }
};

/**
 * Processes an entrypoint construct
 * 
 * @param entrypoint The entrypoint construct
 * @param journal The journal
 */
export async function processEntrypoint(entrypoint: any, journal: Journal): Promise<void> {
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
export async function processExitPoint(exitPoint: any, journal: Journal): Promise<void> {
  // Create an entity for the exit point
  const entityId = journal.createEntity();
  
  // Add an ExitPointComponent
  journal.addComponent(entityId, 'ExitPointComponent', {
    type: 'ExitPointComponent',
    id: exitPoint.node.id,
    exitMessage: exitPoint.getExitMessage()
  });
}