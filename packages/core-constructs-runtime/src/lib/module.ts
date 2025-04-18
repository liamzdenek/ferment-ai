import { Construct } from 'constructs';
import {
  AgentContext,
  AGENT_CONTEXT_TASK_DEF,
  INVOKE_MODEL_TASK_DEF,
  OllamaModel,
  GET_AVAILABLE_CAPABILITIES_TASK_DEF,
  MCPCapabilityGetAvailableCapabilities
} from '@ferment-ai/core-constructs-lib';
import {
  Module,
  WorkflowTask,
} from '@ferment-ai/runtime-common';
import { createOllamaTaskImpl } from './OllamaModelTask.js';
import { z } from 'zod';
import { createAgentContextTaskImpl } from './AgentContextTask.js';
import { createMcpGetAvailableCapabilitiesTaskImpl } from './MCPCapabilityTask.js';

/**
 * Creates a core constructs module
 *
 * @returns A module that maps core constructs to task implementations
 */
export function createCoreConstructsModule(): Module {
  return (construct: Construct) => {
    // Check if the construct is an AgentContext

    if(construct instanceof WorkflowTask) {
      switch(construct.taskDef.taskDefId) {
        case INVOKE_MODEL_TASK_DEF.taskDefId:
          return createOllamaTaskImpl(construct as OllamaModel); // we cast here instead of using instanceof so that reimplementors of the `-lib` works
        case AGENT_CONTEXT_TASK_DEF.taskDefId:
          return createAgentContextTaskImpl(construct as AgentContext);
        case GET_AVAILABLE_CAPABILITIES_TASK_DEF.taskDefId:
          return createMcpGetAvailableCapabilitiesTaskImpl(construct as MCPCapabilityGetAvailableCapabilities)
        default:
          //fallthrough
      }
    }
    
    // No task implementation for this construct from this module. other modules may have an impl
    return undefined;
  };
}