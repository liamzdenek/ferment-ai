import { Construct } from 'constructs';
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
   * @param construct The construct to check
   * @returns Whether this binding class can bind the given node
   */
  public abstract canBind(construct: Construct): boolean;

  /**
   * Binds the given node to the journal system
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  public async bind(construct: Construct): Promise<BindingResult> {
    try {
      // Check if this binding class can bind the node
      if (!this.canBind(construct)) {
        return {
          success: false,
          constructId: construct.node.id,
          constructType: this.constructType,
          errors: [
            {
              constructId: construct.node.id,
              message: `Cannot bind construct ${construct.node.id} with binding class ${this.id}`,
            },
          ],
          warnings: [],
        };
      }

      // Perform the binding
      const bindingResult = await this.doBind(construct);

      // Publish an event to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'construct_bound',
        constructId: construct.node.id,
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
        constructId: construct.node.id,
        constructType: this.constructType,
        error: error.message,
      });

      return {
        success: false,
        constructId: construct.node.id,
        constructType: this.constructType,
        errors: [
          {
            constructId: construct.node.id,
            message: `Error binding construct ${construct.node.id}: ${error.message}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Performs the actual binding
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  protected abstract doBind(construct: Construct): Promise<BindingResult>;

  /**
   * Creates a successful binding result
   * 
   * @param construct The construct that was bound
   * @returns A successful binding result
   */
  protected createSuccessResult(construct: Construct): BindingResult {
    return {
      success: true,
      constructId: construct.node.id,
      constructType: this.constructType,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Creates a failed binding result
   * 
   * @param construct The construct that failed to bind
   * @param message The error message
   * @returns A failed binding result
   */
  protected createFailureResult(construct: Construct, message: string): BindingResult {
    return {
      success: false,
      constructId: construct.node.id,
      constructType: this.constructType,
      errors: [
        {
          constructId: construct.node.id,
          message,
        },
      ],
      warnings: [],
    };
  }

  /**
   * Creates a binding result with warnings
   * 
   * @param construct The construct that was bound
   * @param warnings The warning messages
   * @returns A binding result with warnings
   */
  protected createWarningResult(construct: Construct, warnings: string[]): BindingResult {
    return {
      success: true,
      constructId: construct.node.id,
      constructType: this.constructType,
      errors: [],
      warnings: warnings.map(message => ({
        constructId: construct.node.id,
        message,
      })),
    };
  }
}