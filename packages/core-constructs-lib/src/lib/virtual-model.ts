import { Construct } from 'constructs';

/**
 * Properties for the VirtualModel construct
 */
export interface VirtualModelProps {
  /**
   * The name of the virtual model
   * @default - The construct ID
   */
  readonly name?: string;
}

/**
 * A VirtualModel is a top-level container for agent systems
 * 
 * It represents a complete agent system that can be executed
 * through the Ferment API. A VirtualModel contains one or more
 * AgentContexts, an Entrypoint, and optionally an ExitPoint.
 */
export class VirtualModel extends Construct {
  /**
   * The name of the virtual model
   */
  public readonly name: string;

  /**
   * The entrypoint for the virtual model
   */
  private _entrypoint?: Construct;

  /**
   * The exit point for the virtual model
   */
  private _exitPoint?: Construct;

  /**
   * Creates a new instance of the VirtualModel class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: VirtualModelProps = {}) {
    super(scope, id);
    this.name = props.name ?? id;
  }

  /**
   * Sets the entrypoint for the virtual model
   * 
   * @param entrypoint The entrypoint construct
   */
  public set entrypoint(entrypoint: Construct) {
    this._entrypoint = entrypoint;
  }

  /**
   * Gets the entrypoint for the virtual model
   */
  public get entrypoint(): Construct | undefined {
    return this._entrypoint;
  }

  /**
   * Sets the exit point for the virtual model
   * 
   * @param exitPoint The exit point construct
   */
  public set exitPoint(exitPoint: Construct) {
    this._exitPoint = exitPoint;
  }

  /**
   * Gets the exit point for the virtual model
   */
  public get exitPoint(): Construct | undefined {
    return this._exitPoint;
  }

  /**
   * Validates the virtual model
   * 
   * @throws Error if the virtual model is invalid
   */
  public validate(): void {
    if (!this._entrypoint) {
      throw new Error(`Virtual model ${this.name} must have an entrypoint`);
    }
  }
}