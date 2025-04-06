import { Construct, Node } from 'constructs';
import {
  RuntimeModule,
  createStandardRuntimeModule,
  ConstructSetupMap,
  Journal
} from '@ferment-ai/runtime-common';
import { AgentContextBinding } from './binding/agent-context-binding.js';
import { ExitPointToolBinding } from './binding/exit-point-tool-binding.js';
import { ModelBinding } from './binding/model-binding.js';
import { SendEmailToolBinding } from './binding/send-email-tool-binding.js';
import { ToolBinding } from './binding/tool-binding.js';

/**
 * Creates a core constructs runtime module
 * 
 * @returns A runtime module for core constructs
 */
export function createCoreConstructsRuntimeModule(): RuntimeModule {
  return createStandardRuntimeModule({
    id: 'core-constructs',
    version: '1.0.0',
    dependencies: [],
    getSetupMap(journal) {
      const allBindingClasses = [
        new ModelBinding(journal),
        new AgentContextBinding(journal),
        new ToolBinding(journal),
        new SendEmailToolBinding(journal),
        new ExitPointToolBinding(journal),
      ];
      
      // Create a setup map from constructor names to setup functions
      const setupMap: ConstructSetupMap = new Map();
      
      // Add setup functions for each binding class
      for (const bindingClass of allBindingClasses) {
        setupMap.set(bindingClass.constructType, async (construct: Construct, journal: Journal) => {
          const result = await bindingClass.bind(construct);
          if (!result.success) {
            console.warn(`Failed to bind construct ${construct.node.id} with binding class ${bindingClass.id}: ${result.errors.map(e => e.message).join(', ')}`);
          }
        });
      }

      return setupMap;
    },
  });
}