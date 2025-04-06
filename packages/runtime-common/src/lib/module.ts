import type { Journal } from '@ferment-ai/journal';
import { RootConstruct } from 'constructs';

/**
 * Module dependency
 */
export interface ModuleDependency {
  /**
   * The ID of the module that this module depends on
   */
  readonly moduleId: string;

  /**
   * The minimum version of the module that this module depends on
   */
  readonly minVersion?: string;

  /**
   * The maximum version of the module that this module depends on
   */
  readonly maxVersion?: string;

  /**
   * Whether this dependency is optional
   */
  readonly optional: boolean;
}

/**
 * Module interface
 * 
 * A Module is a function that takes a RootConstruct, parses the tree, and converts it into
 * entities, components, systems, processes, etc., and attaches those to the Journal.
 */
export interface Module {
  /**
   * The ID of this module
   */
  readonly id: string;

  /**
   * The version of this module
   */
  readonly version: string;

  /**
   * The dependencies of this module
   */
  readonly dependencies: ModuleDependency[];

  /**
   * Initializes this module by converting constructs to entities, components, systems, etc.
   * 
   * @param rootConstruct The root construct
   * @param journal The journal to use
   */
  initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void>;
}

/**
 * Initializes a journal with modules
 * 
 * @param rootConstruct The root construct
 * @param modules The modules to initialize
 * @param options The journal options
 * @returns The initialized journal
 */
export async function initializeJournal(
  rootConstruct: RootConstruct,
  modules: Module[],
  options: any = {}
): Promise<Journal> {
  // Create a new journal
  const journal = (await import('@ferment-ai/journal')).createJournal(options);
  
  // Initialize each module
  for (const module of modules) {
    await module.initialize(rootConstruct, journal);
  }
  
  // Validate that all constructs are bound
  journal.validateAllConstructsBound(rootConstruct);
  
  return journal;
}