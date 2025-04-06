import { Node } from 'constructs';
import { Journal, BindingResult } from '@ferment-ai/runtime-common';
import { BaseBinding } from './base-binding.js';

/**
 * Binding class for Tool constructs
 */
export class ToolBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'tool-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'Tool';

  /**
   * Creates a new ToolBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  public canBind(node: Node): boolean {
    // Check if the node's constructor name is 'Tool'
    return node.constructor.name === 'Tool';
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected async doBind(node: Node): Promise<BindingResult> {
    // In a real implementation, we would extract information from the tool
    // and store it in the journal. For now, we'll just return success.
    return this.createSuccessResult(node);
  }
}