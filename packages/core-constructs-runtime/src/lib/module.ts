import { Construct } from 'constructs';
import {
  AgentContext,
  AGENT_CONTEXT_TASK_DEF,
  INVOKE_MODEL_TASK_DEF,
  OllamaModel,
  GET_AVAILABLE_CAPABILITIES_TASK_DEF,
  MCPCapabilityGetAvailableCapabilities,
  EXECUTE_CAPABILITY_TASK_DEF,
  MCPCapabilityExecuteCapability,
  CapableModel,
  CAPABLE_WORKFLOW_TASK_DEF,
  FORMAT_PROMPT_TASK_DEF,
  TagCapabilityParserFormatPromptTask,
  PARSE_MODEL_RESPONSE_TASK_DEF,
  TagCapabilityParserParseModelResponseTask
} from '@ferment-ai/core-constructs-lib';
import {
  Module,
  WorkflowTask,
} from '@ferment-ai/runtime-common';
import { createOllamaTaskImpl } from './OllamaModelTask.js';
import { createAgentContextTaskImpl } from './AgentContextTask.js';
import { createMcpExecuteCapabilityTaskImpl, createMcpGetAvailableCapabilitiesTaskImpl } from './MCPCapabilityTasks.js';
import { createCapableModelTask } from './CapableModelTask.js';
import { createTagCapabilityParserFormatPromptTask, createTagCapabilityParserParseModelResponseTask } from './TagCapabilityParserTasks.js';

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
        // we cast the constructs here instead of using instanceof so that reimplementors of the `-lib` works
        case INVOKE_MODEL_TASK_DEF.taskDefId:
          return createOllamaTaskImpl(construct as OllamaModel);
        case AGENT_CONTEXT_TASK_DEF.taskDefId:
          return createAgentContextTaskImpl(construct as AgentContext);
        case GET_AVAILABLE_CAPABILITIES_TASK_DEF.taskDefId:
          return createMcpGetAvailableCapabilitiesTaskImpl(construct as MCPCapabilityGetAvailableCapabilities);
        case EXECUTE_CAPABILITY_TASK_DEF.taskDefId:
          return createMcpExecuteCapabilityTaskImpl(construct as MCPCapabilityExecuteCapability);
        case CAPABLE_WORKFLOW_TASK_DEF.taskDefId:
          return createCapableModelTask(construct as CapableModel);
        case FORMAT_PROMPT_TASK_DEF.taskDefId:
          return createTagCapabilityParserFormatPromptTask(construct as TagCapabilityParserFormatPromptTask);
        case PARSE_MODEL_RESPONSE_TASK_DEF.taskDefId:
          return createTagCapabilityParserParseModelResponseTask(construct as TagCapabilityParserParseModelResponseTask);
        default:
          //fallthrough
      }
    }
    
    // No task implementation for this construct from this module. other modules may have an impl
    return undefined;
  };
}