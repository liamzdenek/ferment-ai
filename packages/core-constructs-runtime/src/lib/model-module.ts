import { Node } from 'constructs';
import { Journal, EventType } from '@ferment-ai/journal';
import { RuntimeModule, ValidationResult, ExecutionContext, ExecutionResult } from './runtime-module.js';

/**
 * ModelModule is a runtime module that processes Model constructs and binds them to the journal system.
 * 
 * It provides access to LLM models and handles model invocation.
 */
export class ModelModule implements RuntimeModule {
  /**
   * The ID of this module
   */
  public readonly id = 'model';

  /**
   * The version of this module
   */
  public readonly version = '1.0.0';

  /**
   * The dependencies of this module
   */
  public readonly dependencies = [
    {
      moduleId: 'journal',
      optional: false,
    },
  ];

  /**
   * The models managed by this module
   */
  private readonly models: Map<string, any> = new Map();

  /**
   * The journal subscription ID
   */
  private subscriptionId?: string;

  /**
   * Creates a new ModelModule
   * 
   * @param journal The journal to use
   */
  constructor(private readonly journal: Journal) {}

  /**
   * Initializes this module
   * 
   * @param rootNode The root node of the construct tree
   */
  public async initialize(rootNode: Node): Promise<void> {
    // Find all Model constructs in the tree
    this.findModelConstructs(rootNode);

    // Subscribe to model invocation events
    this.subscriptionId = this.journal.subscribe(
      (event) => this.handleModelInvocation(event),
      { type: EventType.AGENT, target: 'model' }
    );
  }

  /**
   * Validates this module
   */
  public async validate(): Promise<ValidationResult> {
    const errors: Array<{ moduleId: string; message: string }> = [];
    const warnings: Array<{ moduleId: string; message: string }> = [];

    // Validate that we have at least one model
    if (this.models.size === 0) {
      warnings.push({
        moduleId: this.id,
        message: 'No models found in the construct tree',
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
    // Nothing to execute for the model module
    return {
      success: true,
      errors: [],
      data: {
        models: Array.from(this.models.keys()),
      },
    };
  }

  /**
   * Gets a model by ID
   * 
   * @param id The ID of the model
   */
  public getModel(id: string): any {
    return this.models.get(id);
  }

  /**
   * Finds all Model constructs in the tree
   * 
   * @param node The node to search
   */
  private findModelConstructs(node: Node): void {
    // Check if this node is a Model construct
    // In a real implementation, we would need to handle the fact that
    // node.host is private. For now, we'll just use the constructor name
    // of the node itself.
    const constructType = node.constructor.name;
    if (constructType.includes('Model') && constructType !== 'VirtualModel') {
      // Add the model to the map
      this.models.set(node.id, construct);

      // Publish an event to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'model_registered',
        modelId: node.id,
        modelType: construct.constructor.name,
      });
    }

    // Recursively search child nodes
    for (const child of node.children) {
      this.findModelConstructs(child as unknown as Node);
    }
  }

  /**
   * Handles model invocation events
   * 
   * @param event The event to handle
   */
  private handleModelInvocation(event: any): void {
    const { modelId, prompt, parameters } = event.payload;

    // Get the model
    const model = this.getModel(modelId);
    if (!model) {
      // Publish an error event
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'model_invocation_error',
        modelId,
        error: `Model ${modelId} not found`,
      });
      return;
    }

    // In a real implementation, we would invoke the model here
    // For now, we'll just publish a mock response
    this.journal.publish(EventType.SYSTEM, this.id, {
      action: 'model_invocation_response',
      modelId,
      response: `Response to prompt: ${prompt}`,
    });
  }
}