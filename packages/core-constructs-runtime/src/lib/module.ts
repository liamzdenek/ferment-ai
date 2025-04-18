import { Construct } from 'constructs';
import {
  AgentContext,
  AGENT_CONTEXT_TASK_DEF,
  INVOKE_MODEL_TASK_DEF,
  OllamaModel
} from '@ferment-ai/core-constructs-lib';
import {
  Module,
  WorkflowTask,
} from '@ferment-ai/runtime-common';
import { createOllamaTaskImpl } from './ollamaTask.js';
import { z } from 'zod';
import { createAgentContextTaskImpl } from './agentContextTask.js';

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
        default:
          //fallthrough
      }
    }

    /*
    if (construct instanceof AgentContext) {
      return createAgentContextTaskImpl(construct);
    }
    
    // Check if the construct is an OpenAIModel
    if (construct instanceof OpenAIModel) {
      return createOpenAIModelTaskImpl(construct);
    }
    
    // Check if the construct is a Model
    if (construct instanceof Model) {
      return createModelTaskImpl(construct);
    }
    
    // Check if the construct is a Workflow.Task
    if (construct instanceof WorkflowTask) {
      // Check if it's an EndTask
      if (construct instanceof WorkflowEndTask) {
        return createWorkflowEndTaskImpl(construct);
      }

      return createPromptTaskImpl(construct);
    }
      */
    
    // No task implementation for this construct from this module. other modules may have an impl
    return undefined;
  };
}