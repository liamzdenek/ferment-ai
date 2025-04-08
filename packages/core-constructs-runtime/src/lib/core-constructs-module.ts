import { RootConstruct } from 'constructs';
import { Module, Journal } from '@ferment-ai/runtime-interfaces';
import { processConstruct } from './common/process-construct.js';
import { agentSystem } from './agent/agent.js';
import { toolSystem } from './tool/tool.js';
import { entrypointSystem } from './entrypoint/entrypoint.js';

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
      processConstruct(rootConstruct, journal, processedConstructs);
      
      // Register systems
      journal.mountSystem(agentSystem);
      journal.mountSystem(toolSystem);
      journal.mountSystem(entrypointSystem);
    }
  };
}