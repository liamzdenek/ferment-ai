import { Construct } from 'constructs';
import { FermentConstruct, FermentConstructProps } from './base-construct.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Properties for the Tool construct
 */
export interface ToolProps extends FermentConstructProps {
  /**
   * The name of the tool
   */
  readonly name: string;

  /**
   * The description of the tool
   */
  readonly description: string;
}

/**
 * A Tool represents a capability that can be used by an agent
 * 
 * It contains the configuration for a specific tool, including
 * its name, description, input schema, and execution logic.
 */
export abstract class Tool<
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType
> extends FermentConstruct {
  /**
   * The name of the tool
   */
  public readonly name: string;

  /**
   * The description of the tool
   */
  public override readonly description: string;

  /**
   * The input schema for the tool
   */
  public abstract readonly inputSchema: TInputSchema;

  /**
   * The output schema for the tool
   */
  public abstract readonly outputSchema: TOutputSchema;

  /**
   * Creates a new instance of the Tool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ToolProps) {
    super(scope, id, props);
    this.name = props.name;
    this.description = props.description;
  }

  /**
   * Converts the tool to a JSON schema definition
   * 
   * @returns The tool definition as a JSON schema
   */
  public toJsonSchema(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      input_schema: zodToJsonSchema(this.inputSchema),
      output_schema: zodToJsonSchema(this.outputSchema),
    };
  }
}

/**
 * Properties for the FileTool construct
 */
export interface FileToolProps extends ToolProps {
  /**
   * The base directory for file operations
   */
  readonly baseDir?: string;
}

/**
 * A FileTool represents a tool for file operations
 */
export class FileTool extends Tool<
  z.ZodObject<{
    path: z.ZodString;
    content?: z.ZodOptional<z.ZodString>;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    content?: z.ZodOptional<z.ZodString>;
  }>
> {
  /**
   * The base directory for file operations
   */
  private readonly baseDir: string;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    path: z.string().describe('The path of the file'),
    content: z.string().optional().describe('The content to write to the file'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the operation was successful'),
    message: z.string().describe('A message describing the result'),
    content: z.string().optional().describe('The content of the file (for read operations)'),
  });

  /**
   * Creates a new instance of the FileTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: FileToolProps) {
    super(scope, id, props);
    this.baseDir = props.baseDir ?? '.';
  }
}

/**
 * Properties for the CommandTool construct
 */
export interface CommandToolProps extends ToolProps {
  /**
   * The working directory for command execution
   */
  readonly cwd?: string;

  /**
   * The timeout for command execution in milliseconds
   */
  readonly timeout?: number;
}

/**
 * A CommandTool represents a tool for executing commands
 */
export class CommandTool extends Tool<
  z.ZodObject<{
    command: z.ZodString;
    args?: z.ZodOptional<z.ZodArray<z.ZodString>>;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
    exitCode: z.ZodNumber;
    stdout: z.ZodString;
    stderr: z.ZodString;
  }>
> {
  /**
   * The working directory for command execution
   */
  private readonly cwd: string;

  /**
   * The timeout for command execution in milliseconds
   */
  private readonly timeout: number;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    command: z.string().describe('The command to execute'),
    args: z.array(z.string()).optional().describe('The arguments for the command'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the command executed successfully'),
    exitCode: z.number().describe('The exit code of the command'),
    stdout: z.string().describe('The standard output of the command'),
    stderr: z.string().describe('The standard error of the command'),
  });

  /**
   * Creates a new instance of the CommandTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: CommandToolProps) {
    super(scope, id, props);
    this.cwd = props.cwd ?? '.';
    this.timeout = props.timeout ?? 30000; // Default timeout: 30 seconds
  }
}