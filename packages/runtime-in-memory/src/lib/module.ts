import { RootConstruct } from 'constructs';
import { Module, Journal, JournalOptions } from '@ferment-ai/runtime-interfaces';
import { createJournal } from './journal-factory.js';

/**
 * Initializes a journal with the given modules
 * 
 * @param rootConstruct The root construct
 * @param modules The modules to initialize
 * @param options The journal options
 * @returns The initialized journal
 */
export async function initializeJournal(
  rootConstruct: RootConstruct,
  modules: Module[],
  options: JournalOptions = {}
): Promise<Journal> {
  // Create a new journal
  const journal = createJournal(options);
  
  // Initialize each module
  for (const module of modules) {
    // Check dependencies
    for (const dependency of module.dependencies) {
      const dependencyModule = modules.find(m => m.id === dependency.id);
      if (!dependencyModule) {
        throw new Error(`Module ${module.id} depends on ${dependency.id}, but it was not provided`);
      }
      
      // Check version
      const [major, minor, patch] = dependency.minVersion.split('.').map(Number);
      const [depMajor, depMinor, depPatch] = dependencyModule.version.split('.').map(Number);
      
      if (depMajor < major || (depMajor === major && depMinor < minor) || 
          (depMajor === major && depMinor === minor && depPatch < patch)) {
        throw new Error(`Module ${module.id} depends on ${dependency.id} >= ${dependency.minVersion}, but ${dependencyModule.version} was provided`);
      }
    }
    
    // Initialize the module
    await module.initialize(rootConstruct, journal);
  }
  
  // Validate that all constructs are bound
  journal.validateAllConstructsBound(rootConstruct);
  
  return journal;
}