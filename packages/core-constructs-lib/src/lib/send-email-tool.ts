import { Construct } from 'constructs';
import { Tool, ToolProps } from './tool.js';
import { AgentContext } from './agent-context.js';
import { z } from 'zod';

/**
 * Properties for the SendEmailTool construct
 */
export interface SendEmailToolProps extends ToolProps {
  /**
   * The target agent to send messages to
   */
  readonly targetAgent: AgentContext;
}

/**
 * A SendEmailTool represents a tool for sending messages to an agent
 */
export class SendEmailTool extends Tool<
  z.ZodObject<{
    message: z.ZodString;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
    messageId: z.ZodString;
  }>
> {
  /**
   * The target agent to send messages to
   */
  private readonly targetAgent: AgentContext;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    message: z.string().describe('The message to send to the agent'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the message was sent successfully'),
    messageId: z.string().describe('The ID of the sent message'),
  });

  /**
   * Creates a new instance of the SendEmailTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: SendEmailToolProps) {
    super(scope, id, props);
    this.targetAgent = props.targetAgent;
  }

  /**
   * Gets the target agent
   */
  public getTargetAgent(): AgentContext {
    return this.targetAgent;
  }
}