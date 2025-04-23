import { Construct } from 'constructs';
import {
  OllamaModel,
  MCPCapabilityGetAvailableCapabilities,
  MCPCapabilityExecuteCapability,
  CapableModel,
  TagCapabilityParserFormatPromptTask,
  StructuredOutputCapabilityParserFormatPromptTask,
  TagCapabilityParserParseModelResponseTask,
  StructuredOutputCapabilityParserParseModelResponseTask,
  DotTemplateParser,
  EditMessagesTask,
  Chain,
  LLMGate,
  StructuredOutput,
  StructuredOutputCapabilityGetAvailableCapabilities,
  StructuredOutputCapabilityExecuteCapability
} from '@ferment-ai/core-constructs-lib';
import {
  Module,
  WorkflowTask,
} from '@ferment-ai/runtime-common';
import { createOllamaTaskImpl } from './OllamaModelTask.js';
import { createMcpExecuteCapabilityTaskImpl, createMcpGetAvailableCapabilitiesTaskImpl } from './MCPCapabilityTasks.js';
import { createCapableModelTask } from './CapableModelTask.js';
import { createTagCapabilityParserFormatPromptTask, createTagCapabilityParserParseModelResponseTask } from './TagCapabilityParserTasks.js';
import { createStructuredOutputCapabilityParserFormatPromptTask, createStructuredOutputCapabilityParserParseModelResponseTask } from './StructuredOutputCapabilityParserTasks.js';
import { createDotTemplateParserTask } from './DotTemplateParserTasks.js';
import { createEditMessagesTask } from './EditMessagesTask.js';
import { createChainTask } from './ChainTask.js';
import { createLlmGateTask } from './LLMGateTask.js';
import { createStructuredOutputCapabilityExecuteCapabilityTask, createStructuredOutputCapabilityGetCapabilitiesTask, createStructuredOutputTask } from './StructuredOutputTasks.js';
import { ZodUnknown } from 'zod';

/**
 * Creates a core constructs module
 *
 * @returns A module that maps core constructs to task implementations
 */
export function createCoreConstructsModule(): Module {
  return (construct: Construct) => {
    // Check if the construct is a WorkflowTask
    if (construct instanceof WorkflowTask) {
      // Ollama model check
      if (construct instanceof OllamaModel) {
        return createOllamaTaskImpl(construct);
      }

      // MCP capabilities checks
      if (construct instanceof MCPCapabilityGetAvailableCapabilities) {
        return createMcpGetAvailableCapabilitiesTaskImpl(construct);
      }

      if (construct instanceof MCPCapabilityExecuteCapability) {
        return createMcpExecuteCapabilityTaskImpl(construct);
      }

      // Capable model and push messages tasks
      if (construct instanceof CapableModel) {
        return createCapableModelTask(construct);
      }

      // Tag Capability
      if (construct instanceof TagCapabilityParserFormatPromptTask) {
        return createTagCapabilityParserFormatPromptTask(construct);
      }
      if (construct instanceof TagCapabilityParserParseModelResponseTask) {
        return createTagCapabilityParserParseModelResponseTask(construct);
      }

      // Structured Output Capability
      if (construct instanceof StructuredOutputCapabilityParserFormatPromptTask) {
        return createStructuredOutputCapabilityParserFormatPromptTask(construct);
      }
      if (construct instanceof StructuredOutputCapabilityParserParseModelResponseTask) {
        return createStructuredOutputCapabilityParserParseModelResponseTask(construct);
      }

      // Template parsers
      if (construct instanceof DotTemplateParser) {
        return createDotTemplateParserTask(construct);
      }

      // Workflows
      if(construct instanceof Chain) {
        return createChainTask(construct);
      }
      if (construct instanceof EditMessagesTask) {
        return createEditMessagesTask(construct);
      }
      if(construct instanceof LLMGate) {
        return createLlmGateTask(construct);
      }

      // Structured Output
      if(construct instanceof StructuredOutput) {
        return createStructuredOutputTask(construct);
      }
      if(construct instanceof StructuredOutputCapabilityGetAvailableCapabilities) {
        return createStructuredOutputCapabilityGetCapabilitiesTask(construct);
      }
      if(construct instanceof StructuredOutputCapabilityExecuteCapability) {
        return createStructuredOutputCapabilityExecuteCapabilityTask(construct);
      }
    }

    // No task implementation for this construct from this module. other modules may have an impl
    return undefined;
  };
}