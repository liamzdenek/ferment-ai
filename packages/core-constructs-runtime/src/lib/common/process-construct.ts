import { Journal } from '@ferment-ai/runtime-interfaces';
import { processAgentContext } from '../agent/agent.js';
import { processEntrypoint, processExitPoint } from '../entrypoint/entrypoint.js';
import { processVirtualModel, processModel } from '../model/model.js';
import { processTool } from '../tool/tool.js';

/**
 * Processes a construct and its children
 * 
 * @param construct The construct to process
 * @param journal The journal
 * @param processedConstructs A set of processed construct IDs
 */
export function processConstruct(
  construct: any,
  journal: Journal,
  processedConstructs: Set<string>
): void {
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
      processAgentContext(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::VirtualModel' || constructType === 'CoreConstructs::TwoAgentModel') {
      processVirtualModel(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Model' ||
               constructType === 'CoreConstructs::OpenAIModel' ||
               constructType === 'CoreConstructs::AnthropicModel') {
      processModel(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Tool' ||
               constructType === 'CoreConstructs::SendEmailTool' ||
               constructType === 'CoreConstructs::ExitPointTool') {
      processTool(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::Entrypoint') {
      processEntrypoint(construct, journal);
      journal.markConstructAsBound(constructId);
    } else if (constructType === 'CoreConstructs::ExitPoint') {
      processExitPoint(construct, journal);
      journal.markConstructAsBound(constructId);
    }
  }
  
  // Process child constructs
  for (const child of construct.node.children) {
    processConstruct(child, journal, processedConstructs);
  }
}