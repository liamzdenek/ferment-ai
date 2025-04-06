import { Construct } from 'constructs';
import { FermentConstruct, FermentConstructProps } from './base-construct.js';

/**
 * Properties for the AgentContext construct
 */
export interface AgentContextProps extends FermentConstructProps {
  /**
   * The prompt template for the agent
   */
  readonly prompt: string;

  /**
   * The model to use for the agent
   */
  readonly model: Construct;

  /**
   * Optional tools for the agent
   */
  readonly tools?: Construct[];
}

/**
 * An AgentContext represents an environment for a single agent
 * 
 * It contains the agent's prompt, model, and tools. The AgentContext
 * is responsible for managing the agent's state and interactions.
 */
export class AgentContext extends FermentConstruct {
  /**
   * The prompt template for the agent
   */
  public readonly prompt: string;

  /**
   * The model to use for the agent
   */
  public readonly model: Construct;

  /**
   * The tools available to the agent
   */
  private readonly _tools: Construct[] = [];

  /**
   * Creates a new instance of the AgentContext class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: AgentContextProps) {
    super(scope, id, props);
    this.prompt = props.prompt;
    this.model = props.model;

    // Add tools if provided
    if (props.tools) {
      for (const tool of props.tools) {
        this.addTool(tool);
      }
    }
  }

  /**
   * Adds a tool to the agent context
   * 
   * @param tool The tool to add
   * @returns The agent context
   */
  public addTool(tool: Construct): AgentContext {
    this._tools.push(tool);
    return this;
  }

  /**
   * Gets the tools available to the agent
   */
  public get tools(): Construct[] {
    return [...this._tools];
  }

  /**
   * Creates a tool that sends a message to this agent
   * 
   * @returns A tool that can be used to send messages to this agent
   */
  public sendEmailTool(): Construct {
    // This is a placeholder for now
    // In a real implementation, this would create a tool that
    // sends a message to this agent
    return new Construct(this, `${this.node.id}SendEmailTool`);
  }
}