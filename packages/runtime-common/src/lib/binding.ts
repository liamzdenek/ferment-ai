import { Construct, Node } from 'constructs';

/**
 * Result of binding a construct to the journal system
 */
export interface BindingResult {
  /**
   * Whether the binding was successful
   */
  readonly success: boolean;

  /**
   * The ID of the construct that was bound
   */
  readonly constructId: string;

  /**
   * The type of the construct that was bound
   */
  readonly constructType: string;

  /**
   * Errors that occurred during binding
   */
  readonly errors: BindingError[];

  /**
   * Warnings that occurred during binding
   */
  readonly warnings: BindingWarning[];
}

/**
 * Error that occurred during binding
 */
export interface BindingError {
  /**
   * The ID of the construct that had the error
   */
  readonly constructId: string;

  /**
   * The error message
   */
  readonly message: string;
}

/**
 * Warning that occurred during binding
 */
export interface BindingWarning {
  /**
   * The ID of the construct that had the warning
   */
  readonly constructId: string;

  /**
   * The warning message
   */
  readonly message: string;
}

/**
 * A binding class is responsible for binding a construct to the journal system.
 * 
 * Binding classes are created by the CoreConstructsRuntimeModule and are used
 * to bind constructs to the journal system.
 */
export interface BindingClass {
  /**
   * The ID of this binding class
   */
  readonly id: string;

  /**
   * The type of construct that this binding class can bind
   */
  readonly constructType: string;

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  canBind(node: Construct): boolean;

  /**
   * Binds the given node to the journal system
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  bind(node: Construct): Promise<BindingResult>;
}

/**
 * A factory for creating binding classes
 */
export interface BindingClassFactory {
  /**
   * Creates a binding class for the given construct type
   * 
   * @param constructType The type of construct to create a binding class for
   * @returns The binding class, or undefined if no binding class is available for the given construct type
   */
  createBindingClass(constructType: string): BindingClass | undefined;

  /**
   * Gets all available binding classes
   * 
   * @returns All available binding classes
   */
  getAllBindingClasses(): BindingClass[];
}