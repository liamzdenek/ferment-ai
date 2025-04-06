import { Construct } from 'constructs';
import { Journal, BindingResult } from '@ferment-ai/runtime-common';
import { BaseBinding } from './base-binding.js';

/**
 * Binding class for AgentContext constructs
 */
export class AgentContextBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'agent-context-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'AgentContext';

  /**
   * Creates a new AgentContextBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The construct to check
   * @returns Whether this binding class can bind the given node
   */
  public canBind(node: Construct): boolean {
    // Check if the node's constructor name is 'AgentContext'
    return node.constructor.name === 'AgentContext';
  }

  /**
   * Performs the actual binding
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  protected async doBind(construct: Construct): Promise<BindingResult> {
    // In a real implementation, we would extract information from the agent context
    // and store it in the journal. For now, we'll just return success.
    return this.createSuccessResult(construct);
  }
}