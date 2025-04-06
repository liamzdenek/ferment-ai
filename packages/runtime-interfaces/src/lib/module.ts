import type { RootConstruct } from 'constructs';
import type { Journal } from './journal.js';

/**
 * Module dependency
 */
export interface ModuleDependency {
  /**
   * The ID of the module
   */
  id: string;

  /**
   * The minimum version of the module
   */
  minVersion: string;
}

/**
 * Module interface
 * 
 * A module is responsible for initializing a part of the system.
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
   * Initializes this module
   * 
   * @param rootConstruct The root construct
   * @param journal The journal
   */
  initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void>;
}

/**
 * Initializes a journal with the given modules
 * 
 * @param rootConstruct The root construct
 * @param modules The modules to initialize
 * @param options The journal options
 * @returns The initialized journal
 */
export interface JournalInitializer {
  (rootConstruct: RootConstruct, modules: Module[], options?: any): Promise<Journal>;
}