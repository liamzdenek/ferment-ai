import { Node } from 'constructs';
import { RuntimeModule } from './runtime-module.js';
import { BindingClass, BindingClassFactory } from './binding.js';

/**
 * Options for the CoreConstructsRuntimeModule
 */
export interface CoreConstructsRuntimeModuleOptions {
  /**
   * The binding class factory to use
   */
  readonly bindingClassFactory: BindingClassFactory;

  /**
   * Whether to enable validation
   */
  readonly enableValidation?: boolean;

  /**
   * Whether to enable automatic binding
   */
  readonly enableAutomaticBinding?: boolean;
}

/**
 * The CoreConstructsRuntimeModule is responsible for binding constructs from
 * core-constructs-lib to the journal system.
 * 
 * It navigates the construct tree and marks each class as bound when a match is found.
 * It contains separate binding classes for each construct type.
 */
export interface CoreConstructsRuntimeModule extends RuntimeModule {
  /**
   * Gets the binding class factory
   */
  readonly bindingClassFactory: BindingClassFactory;

  /**
   * Gets all binding classes
   */
  readonly bindingClasses: BindingClass[];

  /**
   * Gets the constructs that have been bound
   */
  readonly boundConstructs: Set<string>;

  /**
   * Binds a node to the journal system
   * 
   * @param node The node to bind
   * @returns Whether the node was bound
   */
  bindNode(node: Node): Promise<boolean>;

  /**
   * Binds all nodes in the tree to the journal system
   * 
   * @param rootNode The root node of the tree
   * @returns The number of nodes that were bound
   */
  bindAll(rootNode: Node): Promise<number>;

  /**
   * Checks if a node is bound
   * 
   * @param node The node to check
   * @returns Whether the node is bound
   */
  isBound(node: Node): boolean;

  /**
   * Gets the binding class for a node
   * 
   * @param node The node to get the binding class for
   * @returns The binding class, or undefined if no binding class is available for the node
   */
  getBindingClass(node: Node): BindingClass | undefined;
}