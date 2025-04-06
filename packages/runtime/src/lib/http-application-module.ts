import { RootConstruct } from 'constructs';
import type { Module } from '@ferment-ai/runtime-common';
import type { Journal } from '@ferment-ai/journal';

/**
 * Creates an HTTP application module
 * 
 * @returns A module for HTTP applications
 */
export function createHttpApplicationModule(): Module {
  return {
    id: 'HttpApplication::Module',
    version: '1.0.0',
    dependencies: [],
    
    async initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void> {
      // Create a set to track which constructs have been processed
      const processedConstructs = new Set<string>();
      
      // Process the construct tree
      await processConstruct(rootConstruct, journal, processedConstructs);
    }
  };
}

/**
 * Processes a construct and its children
 * 
 * @param construct The construct to process
 * @param journal The journal
 * @param processedConstructs A set of processed construct IDs
 */
async function processConstruct(
  construct: any,
  journal: Journal,
  processedConstructs: Set<string>
): Promise<void> {
  const constructId = construct.node.id;
  
  // Skip if already processed
  if (processedConstructs.has(constructId)) {
    return;
  }
  
  // Mark as processed
  processedConstructs.add(constructId);
  
  // Process based on construct type
  console.log('Processing construct:', constructId, construct.constructor.name);
  
  if (construct.constructor.name === 'HttpApplication') {
    console.log('Found HttpApplication:', constructId);
    // Mark the HttpApplication as bound
    journal.markConstructAsBound(constructId);
  }
  
  // Process child constructs
  for (const child of construct.node.children) {
    await processConstruct(child, journal, processedConstructs);
  }
}