import { Node } from 'constructs';
import { Journal, BindingResult, EventType } from '@ferment-ai/runtime-common';
import { BaseBinding } from './base-binding.js';

/**
 * Binding class for ExitPointTool constructs
 */
export class ExitPointToolBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'exit-point-tool-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'ExitPointTool';

  /**
   * Creates a new ExitPointToolBinding
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
    return node.constructor.name === 'ExitPointTool';
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected async doBind(node: Node): Promise<BindingResult> {
    try {
      const tool = node.findAll().find(n => n.node.id === node.id)?.node.host as any;
      
      // Extract tool information
      const toolInfo = {
        id: node.id,
        type: node.constructor.name,
        name: tool.name,
        description: tool.description,
        exitPointId: tool.getExitPoint().node.id,
        inputSchema: JSON.stringify(tool.toJsonSchema().input_schema),
        outputSchema: JSON.stringify(tool.toJsonSchema().output_schema),
      };
      
      // Publish tool information to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_registered',
        tool: toolInfo,
      });

      // Subscribe to tool invocations
      const subscriptionId = this.journal.subscribe(
        (event) => {
          if (event.type === EventType.TOOL && event.target === node.id) {
            this.handleToolInvocation(node, event);
          }
        },
        {
          type: EventType.TOOL,
          target: node.id,
        }
      );

      // Store the subscription ID for cleanup
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_subscription_created',
        toolId: node.id,
        subscriptionId,
      });
      
      return this.createSuccessResult(node);
    } catch (error: any) {
      return this.createFailureResult(node, `Failed to bind exit point tool: ${error.message}`);
    }
  }

  /**
   * Handles a tool invocation
   * 
   * @param node The tool node
   * @param event The journal event
   */
  private async handleToolInvocation(node: Node, event: any): Promise<void> {
    try {
      const tool = node.findAll().find(n => n.node.id === node.id)?.node.host as any;
      const exitPoint = tool.getExitPoint();
      
      // Validate the input
      const input = event.payload.input;
      const validationResult = tool.inputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new Error(`Invalid input: ${validationResult.error.message}`);
      }
      
      // Publish the exit event to the journal
      this.journal.publish(EventType.SYSTEM, node.id, {
        action: 'virtual_model_exit',
        result: input.result,
        exitMessage: exitPoint.getExitMessage(),
      });
      
      // Publish the result to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_result',
        result: {
          success: true,
        },
      }, event.source);
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_error',
        error: error.message,
      }, event.source);
    }
  }
}