import { Node } from 'constructs';
import {
  BindingClass,
  BindingResult,
  Journal,
  EventType
} from '@ferment-ai/runtime-common';

/**
 * Base class for binding classes
 */
export abstract class BaseBinding implements BindingClass {
  /**
   * The ID of this binding class
   */
  public abstract readonly id: string;

  /**
   * The type of construct that this binding class can bind
   */
  public abstract readonly constructType: string;

  /**
   * The journal to use
   */
  protected readonly journal: Journal;

  /**
   * Creates a new BaseBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    this.journal = journal;
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  public abstract canBind(node: Node): boolean;

  /**
   * Binds the given node to the journal system
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  public async bind(node: Node): Promise<BindingResult> {
    try {
      // Check if this binding class can bind the node
      if (!this.canBind(node)) {
        return {
          success: false,
          constructId: node.id,
          constructType: this.constructType,
          errors: [
            {
              constructId: node.id,
              message: `Cannot bind node ${node.id} with binding class ${this.id}`,
            },
          ],
          warnings: [],
        };
      }

      // Perform the binding
      const bindingResult = await this.doBind(node);

      // Publish an event to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'construct_bound',
        constructId: node.id,
        constructType: this.constructType,
        success: bindingResult.success,
        errors: bindingResult.errors,
        warnings: bindingResult.warnings,
      });

      return bindingResult;
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'construct_binding_error',
        constructId: node.id,
        constructType: this.constructType,
        error: error.message,
      });

      return {
        success: false,
        constructId: node.id,
        constructType: this.constructType,
        errors: [
          {
            constructId: node.id,
            message: `Error binding node ${node.id}: ${error.message}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected abstract doBind(node: Node): Promise<BindingResult>;

  /**
   * Creates a successful binding result
   * 
   * @param node The node that was bound
   * @returns A successful binding result
   */
  protected createSuccessResult(node: Node): BindingResult {
    return {
      success: true,
      constructId: node.id,
      constructType: this.constructType,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Creates a failed binding result
   * 
   * @param node The node that failed to bind
   * @param message The error message
   * @returns A failed binding result
   */
  protected createFailureResult(node: Node, message: string): BindingResult {
    return {
      success: false,
      constructId: node.id,
      constructType: this.constructType,
      errors: [
        {
          constructId: node.id,
          message,
        },
      ],
      warnings: [],
    };
  }

  /**
   * Creates a binding result with warnings
   * 
   * @param node The node that was bound
   * @param warnings The warning messages
   * @returns A binding result with warnings
   */
  protected createWarningResult(node: Node, warnings: string[]): BindingResult {
    return {
      success: true,
      constructId: node.id,
      constructType: this.constructType,
      errors: [],
      warnings: warnings.map(message => ({
        constructId: node.id,
        message,
      })),
    };
  }
}