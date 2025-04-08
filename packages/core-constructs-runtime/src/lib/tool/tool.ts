import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Journal, System } from '@ferment-ai/runtime-interfaces';
import { 
  useState, 
  useEffect, 
  useEventCallback, 
  useOnUnmountCallback,
  useAttachProcess,
  createEventType
} from '@ferment-ai/runtime-hooks';

// Define event types
export const TOOL_INVOKE_EVENT = createEventType('tool_invoke', z.object({
  toolId: z.string(),
  input: z.any()
}));

export const TOOL_RESULT_EVENT = createEventType('tool_result', z.object({
  toolId: z.string(),
  processId: z.string(),
  result: z.any()
}));

// Define the tool system
export const toolSystem: System = {
  id: 'tool-system',
  
  mount(journal: Journal) {
    // State for active tools
    const [activeTools, setActiveTools] = useState<Record<string, { lastInput: any; timestamp: number }>>({});
    
    // Handle tool invoke events
    useEventCallback(TOOL_INVOKE_EVENT)((event) => {
      const { toolId, input } = event.payload;
      const toolComponent = journal.getComponent<any>(toolId, 'ToolComponent');
      
      if (toolComponent) {
        // Update state to track this tool
        setActiveTools({
          ...activeTools,
          [toolId]: {
            lastInput: input,
            timestamp: Date.now()
          }
        });
        
        // Create a process
        const processId = uuidv4();
        const process = {
          id: processId,
          type: 'ToolProcess',
          status: 'running' as const,
          toolId,
          input,
          startTime: Date.now(),
          sourceSystemId: 'tool-system'
        };
        
        journal.createProcess(process);
        
        // Attach the process to this system
        useAttachProcess(processId);
        
        // Simulate tool execution with a delay
        setTimeout(() => {
          // Complete the process
          journal.completeProcess(processId, {
            success: true,
            data: { result: `Tool ${toolId} processed input: ${JSON.stringify(input)}` }
          });
          
          // Update state
          const newActiveTools = { ...activeTools };
          delete newActiveTools[toolId];
          setActiveTools(newActiveTools);
          
          // Publish result
          journal.publish('tool_result', 'tool-system', {
            toolId,
            processId: processId,
            result: { output: `Tool ${toolId} processed input: ${JSON.stringify(input)}` }
          });
        }, 1000);
      }
    });
    
    // Clean up on unmount
    useOnUnmountCallback(() => {
      console.log('Tool system unmounting');
    });
  }
};

/**
 * Processes a tool construct
 * 
 * @param tool The tool construct
 * @param journal The journal
 */
export async function processTool(tool: any, journal: Journal): Promise<void> {
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