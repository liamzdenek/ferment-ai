import { Node } from 'constructs';
import {
  CoreConstructsRuntimeModule as ICoreConstructsRuntimeModule,
  CoreConstructsRuntimeModuleOptions,
  RuntimeModuleDependency,
  ValidationResult,
  ExecutionContext,
  ExecutionResult,
  BindingClass,
  BindingClassFactory,
  Journal
} from '@ferment-ai/runtime-common';

/**
 * Implementation of the CoreConstructsRuntimeModule interface
 */
export class CoreConstructsRuntimeModule implements ICoreConstructsRuntimeModule {
  /**
   * The ID of this module
   */
  public readonly id = 'core-constructs';

  /**
   * The version of this module
   */
  public readonly version = '1.0.0';

  /**
   * The dependencies of this module
   */
  public readonly dependencies: RuntimeModuleDependency[] = [
    {
      moduleId: 'journal',
      optional: false,
    },
  ];

  /**
   * The binding class factory
   */
  public readonly bindingClassFactory: BindingClassFactory;

  /**
   * The constructs that have been bound
   */
  public readonly boundConstructs: Set<string> = new Set();

  /**
   * Whether validation is enabled
   */
  private readonly enableValidation: boolean;

  /**
   * Whether automatic binding is enabled
   */
  private readonly enableAutomaticBinding: boolean;

  /**
   * The journal to use
   */
  private readonly journal: Journal;

  /**
   * Creates a new CoreConstructsRuntimeModule
   * 
   * @param journal The journal to use
   * @param options The options for this module
   */
  constructor(journal: Journal, options: CoreConstructsRuntimeModuleOptions) {
    this.journal = journal;
    this.bindingClassFactory = options.bindingClassFactory;
    this.enableValidation = options.enableValidation ?? true;
    this.enableAutomaticBinding = options.enableAutomaticBinding ?? true;
  }

  /**
   * Gets all binding classes
   */
  public get bindingClasses(): BindingClass[] {
    return this.bindingClassFactory.getAllBindingClasses();
  }

  /**
   * Initializes this module
   * 
   * @param rootNode The root node of the construct tree
   */
  public async initialize(rootNode: Node): Promise<void> {
    // If automatic binding is enabled, bind all nodes
    if (this.enableAutomaticBinding) {
      await this.bindAll(rootNode);
    }
  }

  /**
   * Validates this module
   */
  public async validate(): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // If validation is not enabled, return success
    if (!this.enableValidation) {
      return { valid: true, errors, warnings };
    }

    // Check if we have any binding classes
    if (this.bindingClasses.length === 0) {
      warnings.push({
        moduleId: this.id,
        message: 'No binding classes available',
      });
    }

    // Check if we have any bound constructs
    if (this.boundConstructs.size === 0) {
      warnings.push({
        moduleId: this.id,
        message: 'No constructs have been bound',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Executes this module
   * 
   * @param context The execution context
   */
  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    // Nothing to execute for this module
    return {
      success: true,
      errors: [],
      data: {
        boundConstructs: Array.from(this.boundConstructs),
      },
    };
  }

  /**
   * Binds a node to the journal system
   * 
   * @param node The node to bind
   * @returns Whether the node was bound
   */
  public async bindNode(node: Node): Promise<boolean> {
    // Check if the node is already bound
    if (this.isBound(node)) {
      return true;
    }

    // Get the binding class for this node
    const bindingClass = this.getBindingClass(node);
    if (!bindingClass) {
      return false;
    }

    // Bind the node
    const result = await bindingClass.bind(node);
    if (result.success) {
      this.boundConstructs.add(node.id);
      return true;
    }

    return false;
  }

  /**
   * Binds all nodes in the tree to the journal system
   * 
   * @param rootNode The root node of the tree
   * @returns The number of nodes that were bound
   */
  public async bindAll(rootNode: Node): Promise<number> {
    let count = 0;

    // Bind this node
    if (await this.bindNode(rootNode)) {
      count++;
    }

    // Bind child nodes recursively
    for (const child of rootNode.children) {
      count += await this.bindAll(child as unknown as Node);
    }

    return count;
  }

  /**
   * Checks if a node is bound
   * 
   * @param node The node to check
   * @returns Whether the node is bound
   */
  public isBound(node: Node): boolean {
    return this.boundConstructs.has(node.id);
  }

  /**
   * Gets the binding class for a node
   * 
   * @param node The node to get the binding class for
   * @returns The binding class, or undefined if no binding class is available for the node
   */
  public getBindingClass(node: Node): BindingClass | undefined {
    // Try each binding class
    for (const bindingClass of this.bindingClasses) {
      if (bindingClass.canBind(node)) {
        return bindingClass;
      }
    }

    return undefined;
  }
}