import { Construct } from 'constructs';
import { FermentConstruct, FermentConstructProps } from './base-construct.js';
import { AgentContext } from './agent-context.js';

/**
 * Properties for the Entrypoint construct
 */
export interface EntrypointProps extends FermentConstructProps {
  /**
   * The agent that will receive the initial prompt
   */
  readonly promptAgent: AgentContext;
}

/**
 * An Entrypoint represents the starting point for a virtual model
 * 
 * It defines which agent will receive the initial prompt from the user.
 */
export class Entrypoint extends FermentConstruct {
  /**
   * The agent that will receive the initial prompt
   */
  public readonly promptAgent: AgentContext;

  /**
   * Creates a new instance of the Entrypoint class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: EntrypointProps) {
    super(scope, id, props);
    this.promptAgent = props.promptAgent;
  }
}

/**
 * Properties for the ExitPoint construct
 */
export interface ExitPointProps extends FermentConstructProps {
  /**
   * Optional message to display when the virtual model exits
   */
  readonly exitMessage?: string;
}

/**
 * An ExitPoint represents the ending point for a virtual model
 * 
 * It defines how the virtual model will terminate and what
 * information will be returned to the user.
 */
export class ExitPoint extends FermentConstruct {
  /**
   * The message to display when the virtual model exits
   */
  private readonly exitMessage?: string;

  /**
   * Creates a new instance of the ExitPoint class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ExitPointProps = {}) {
    super(scope, id, props);
    this.exitMessage = props.exitMessage;
  }

  /**
   * Creates a tool that finishes the virtual model execution
   * 
   * @returns A tool that can be used to finish the virtual model execution
   */
  public finishWorkingTool(): Construct {
    // This is a placeholder for now
    // In a real implementation, this would create a tool that
    // finishes the virtual model execution
    return new Construct(this, `${this.node.id}FinishWorkingTool`);
  }
}