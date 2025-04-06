import { Construct } from 'constructs';
import { Journal, BindingResult, EventType } from '@ferment-ai/runtime-common';
import { BaseBinding } from './base-binding.js';

/**
 * Binding class for SendEmailTool constructs
 */
export class SendEmailToolBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'send-email-tool-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'SendEmailTool';

  /**
   * Creates a new SendEmailToolBinding
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
    return construct.constructor.name === 'SendEmailTool';
  }

  /**
   * Performs the actual binding
   * 
   * @param construct The construct to bind
   * @returns The result of the binding
   */
  protected async doBind(construct: Construct): Promise<BindingResult> {
    try {
      // Instead of accessing construct.host directly, we'll use a different approach
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
        name: `Send Email Tool ${construct.node.id}`,
        description: 'Send a message to an agent',
        targetAgentId: 'unknown', // This will be provided in the event payload
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to send to the agent',
            },
            targetAgentId: {
              type: 'string',
              description: 'The ID of the agent to send the message to',
            },
          },
          required: ['message', 'targetAgentId'],
        }),
        outputSchema: JSON.stringify({
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the message was sent successfully',
            },
            messageId: {
              type: 'string',
              description: 'The ID of the sent message',
            },
          },
          required: ['success', 'messageId'],
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
      return this.createFailureResult(construct, `Failed to bind send email tool: ${error.message}`);
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
      // Get the target agent ID from the input
      const targetAgentId = event.payload.input.targetAgentId;
      
      // Validate the input
      const input = event.payload.input;
      if (!input.message) {
        throw new Error('Message is required');
      }
      if (!targetAgentId) {
        throw new Error('Target agent ID is required');
      }
      
      // Send the message to the target agent
      const messageId = `message-${Date.now()}`;
      this.journal.publish(EventType.AGENT, event.source, {
        action: 'agent_message',
        message: input.message,
        messageId,
      }, targetAgentId);
      
      // Publish the result to the journal
      this.journal.publish(EventType.TOOL, construct.node.id, {
        action: 'tool_result',
        result: {
          success: true,
          messageId,
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