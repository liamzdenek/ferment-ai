import { Construct } from 'constructs';
import { Journal, BindingResult } from '@ferment-ai/runtime-common';
import { BaseBinding } from './base-binding.js';

/**
 * Binding class for Model constructs
 */
export class ModelBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'model-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'Model';

  /**
   * Creates a new ModelBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given construct
   * 
   * @param construct The construct to check
   * @returns Whether this binding class can bind the given construct
   */
  public canBind(construct: Construct): boolean {
    // Check if the construct's constructor name contains 'Model' but is not 'VirtualModel'
    const constructType = construct.constructor.name;
    return constructType.includes('Model') && constructType !== 'VirtualModel';
  }

  /**
   * Performs the actual binding
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  protected async doBind(construct: Construct): Promise<BindingResult> {
    // In a real implementation, we would extract information from the model
    // and store it in the journal. For now, we'll just return success.
    return this.createSuccessResult(construct);
  }
}