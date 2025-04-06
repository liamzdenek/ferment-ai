import { Construct } from 'constructs';
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
   * Checks if this binding class can bind the given construct
   * 
   * @param construct The construct to check
   * @returns Whether this binding class can bind the given construct
   */
  public canBind(construct: Construct): boolean {
    return construct.constructor.name === 'ExitPointTool';
  }

  /**
   * Performs the actual binding
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  protected async doBind(construct: Construct): Promise<BindingResult> {
    try {
      // Instead of accessing construct directly, we'll use a different approach
      // We'll store the tool information in metadata
      const toolMetadata = {
        id: construct.node.id,
        type: construct.constructor.name,
      };
      
      // Extract tool information
      const toolInfo = {
        id: construct.node.id,
        type: construct.constructor.name,
        // We'll use default values for these properties since we can't access the tool directly
        name: `Exit Point Tool ${construct.node.id}`,
        description: 'Finish the virtual model execution and return the result',
        exitPointId: 'unknown', // This will be provided in the event payload
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            result: {
              type: 'string',
              description: 'The result of the virtual model execution',
            },
            exitPointId: {
              type: 'string',
              description: 'The ID of the exit point',
            },
          },
          required: ['result', 'exitPointId'],
        }),
        outputSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the virtual model execution was finished successfully',
            },
          },
          required: ['success'],
        }),
      };
      
      // Publish tool information to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_registered',
        tool: toolInfo,
      });

      // Subscribe to tool invocations
      const subscriptionId = this.journal.subscribe(
        (event) => {
          if (event.type === EventType.TOOL && event.target === construct.node.id) {
            this.handleToolInvocation(construct, event);
          }
        },
        {
          type: EventType.TOOL,
          target: construct.node.id,
        }
      );

      // Store the subscription ID for cleanup
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_subscription_created',
        toolId: construct.node.id,
        subscriptionId,
      });
      
      return this.createSuccessResult(construct);
    } catch (error: any) {
      return this.createFailureResult(construct, `Failed to bind exit point tool: ${error.message}`);
    }
  }

  /**
   * Handles a tool invocation
   * 
   * @param construct The tool construct
   * @param event The journal event
   */
  private async handleToolInvocation(construct: Construct, event: any): Promise<void> {
    try {
      // Get the exit point ID from the input
      const exitPointId = event.payload.input.exitPointId;
      
      // Validate the input
      const input = event.payload.input;
      if (!input.result) {
        throw new Error('Result is required');
      }
      if (!exitPointId) {
        throw new Error('Exit point ID is required');
      }
      
      // Publish the exit event to the journal
      this.journal.publish(EventType.SYSTEM, construct.node.id, {
        action: 'virtual_model_exit',
        result: input.result,
        exitPointId,
      });
      
      // Publish the result to the journal
      this.journal.publish(EventType.TOOL, construct.node.id, {
        action: 'tool_result',
        result: {
          success: true,
        },
      }, event.source);
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.TOOL, construct.node.id, {
        action: 'tool_error',
        error: error.message,
      }, event.source);
    }
  }
}