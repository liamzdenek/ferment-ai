import { Node } from 'constructs';

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
  readonly journal: any; // This would be the Journal type from the journal package

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
 * A runtime module is a component that can be executed by the runtime system.
 * 
 * Runtime modules are created by the ModuleProcessor based on the constructs
 * in the construct tree.
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
   * Initializes this module
   * 
   * @param rootNode The root node of the construct tree
   */
  initialize(rootNode: Node): Promise<void>;

  /**
   * Validates this module
   */
  validate(): Promise<ValidationResult>;

  /**
   * Executes this module
   * 
   * @param context The execution context
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}