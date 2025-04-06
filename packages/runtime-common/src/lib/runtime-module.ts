import { Construct, Node, RootConstruct } from 'constructs';
import { Journal } from './journal.js';

/**
 * Result of validating a runtime module
 */
export interface ValidationResult {
  /**
   * Whether the validation was successful
   */
  readonly valid: boolean;

  /**
   * Errors that occurred during validation
   */
  readonly errors: ValidationError[];

  /**
   * Warnings that occurred during validation
   */
  readonly warnings: ValidationWarning[];
}

/**
 * Error that occurred during validation
 */
export interface ValidationError {
  /**
   * The ID of the module that had the error
   */
  readonly moduleId?: string;

  /**
   * The ID of the construct that had the error
   */
  readonly constructId?: string;

  /**
   * The error message
   */
  readonly message: string;
}

/**
 * Warning that occurred during validation
 */
export interface ValidationWarning {
  /**
   * The ID of the module that had the warning
   */
  readonly moduleId?: string;

  /**
   * The ID of the construct that had the warning
   */
  readonly constructId?: string;

  /**
   * The warning message
   */
  readonly message: string;
}

/**
 * Context for executing a runtime module
 */
export interface ExecutionContext {
  /**
   * The journal to use for execution
   */
  readonly journal: Journal;

  /**
   * The modules available for execution
   */
  readonly modules: Map<string, RuntimeModule>;

  /**
   * Configuration for execution
   */
  readonly config: Record<string, any>;
}

/**
 * Result of executing a runtime module
 */
export interface ExecutionResult {
  /**
   * Whether the execution was successful
   */
  readonly success: boolean;

  /**
   * Errors that occurred during execution
   */
  readonly errors: ExecutionError[];

  /**
   * Data produced by the execution
   */
  readonly data: Record<string, any>;
}

/**
 * Error that occurred during execution
 */
export interface ExecutionError {
  /**
   * The ID of the module that had the error
   */
  readonly moduleId: string;

  /**
   * The error message
   */
  readonly message: string;

  /**
   * The type of error
   */
  readonly type: string;
}

/**
 * Dependency information for a runtime module
 */
export interface RuntimeModuleDependency {
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
 * A runtime module is a component that can be executed by the runtime system.
 *
 * Runtime modules are responsible for binding constructs to the journal system.
 */
export interface RuntimeModule {
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
  readonly dependencies: RuntimeModuleDependency[];

  /**
   * Initializes this module by binding all nodes in the tree
   *
   * @param rootNode The root node of the construct tree
   * @param journal The journal to use
   */
  initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void>;
}

/**
 * A setup function for a specific construct type
 *
 * @param node The node to set up
 * @param journal The journal to use
 * @returns A promise that resolves when the setup is complete
 */
export type ConstructSetupFunction = (construct: Construct) => Promise<void>;

/**
 * A mapping from constructor names to setup functions
 */
export type ConstructSetupMap = Map<string, ConstructSetupFunction>;

/**
 * Options for creating a standard runtime module
 */
export interface StandardRuntimeModuleOptions {
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
  readonly dependencies?: RuntimeModuleDependency[];

  /**
   * A mapping from constructor names to setup functions
   */
  readonly getSetupMap: (journal: Journal) => ConstructSetupMap;
}

/**
 * Creates a standard runtime module that uses a setup map to bind constructs
 *
 * @param options The options for the runtime module
 * @returns A runtime module
 */
export function createStandardRuntimeModule(options: StandardRuntimeModuleOptions): RuntimeModule {
  return {
    id: options.id,
    version: options.version,
    dependencies: options.dependencies || [],
    
    async initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void> {
      const setupMap = options.getSetupMap(journal);
      // Traverse the construct tree and bind nodes
      const traverse = async (construct: Construct): Promise<void> => {
        // Check if this node's constructor name is in the setup map
        const constructorName = construct.constructor.name;
        const setupFunction = setupMap.get(constructorName);

        console.log("constructorName", constructorName, "setupFunction", setupFunction)
        
        if (setupFunction) {
          // Call the setup function with the node and journal
          await setupFunction(construct);
          console.log('setting up node', constructorName, construct.node.id);
        }

        //console.log('node children', construct.node.children);
        
        // Recursively traverse child nodes
        if (construct.node.children && typeof construct.node.children[Symbol.iterator] === 'function') {
          for (const child of construct.node.children) {
            await traverse(child);
          }
        }
      };
      
      // Start traversal from the root node
      await traverse(rootConstruct);
    }
  };
}