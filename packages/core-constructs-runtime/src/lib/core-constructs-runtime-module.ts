import { Node } from 'constructs';
import {
  RuntimeModule,
  createStandardRuntimeModule,
  ConstructSetupMap,
  Journal
} from '@ferment-ai/runtime-common';
import { DefaultBindingClassFactory } from './binding/binding-class-factory.js';

/**
 * Creates a core constructs runtime module
 * 
 * @param journal The journal to use
 * @returns A runtime module for core constructs
 */
export function createCoreConstructsRuntimeModule(): RuntimeModule {
  return {
    id: 'core-constructs',
    version: '1.0.0',
    dependencies: [
      {
        moduleId: 'journal',
        optional: false,
      },
    ],
    
    async initialize(rootNode: Node, journal: Journal): Promise<void> {
      // Create the binding class factory
      const bindingClassFactory = new DefaultBindingClassFactory(journal);
      
      // Create a setup map from constructor names to setup functions
      const setupMap: ConstructSetupMap = new Map();
      
      // Add setup functions for each binding class
      for (const bindingClass of bindingClassFactory.getAllBindingClasses()) {
        setupMap.set(bindingClass.constructType, async (node: Node, journal: Journal) => {
          const result = await bindingClass.bind(node);
          if (!result.success) {
            console.warn(`Failed to bind node ${node.id} with binding class ${bindingClass.id}: ${result.errors.map(e => e.message).join(', ')}`);
          }
        });
      }
      
      // Create the standard runtime module
      const standardModule = createStandardRuntimeModule({
        id: 'core-constructs',
        version: '1.0.0',
        dependencies: [
          {
            moduleId: 'journal',
            optional: false,
          },
        ],
        setupMap,
      });
      
      // Initialize the standard module
      await standardModule.initialize(rootNode, journal);
    }
  };
}