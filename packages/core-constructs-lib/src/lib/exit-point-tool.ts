import { Construct } from 'constructs';
import { Tool, ToolProps } from './tool.js';
import { ExitPoint } from './entrypoint.js';
import { z } from 'zod';

/**
 * Properties for the ExitPointTool construct
 */
export interface ExitPointToolProps extends ToolProps {
  /**
   * The exit point to use
   */
  readonly exitPoint: ExitPoint;
}

/**
 * An ExitPointTool represents a tool for finishing the virtual model execution
 */
export class ExitPointTool extends Tool<
  z.ZodObject<{
    result: z.ZodString;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
  }>
> {
  /**
   * The exit point to use
   */
  private readonly exitPoint: ExitPoint;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    result: z.string().describe('The result of the virtual model execution'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the virtual model execution was finished successfully'),
  });

  /**
   * Creates a new instance of the ExitPointTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ExitPointToolProps) {
    super(scope, id, props);
    this.exitPoint = props.exitPoint;
  }

  /**
   * Gets the exit point
   */
  public getExitPoint(): ExitPoint {
    return this.exitPoint;
  }
}