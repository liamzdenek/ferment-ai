import { Construct } from 'constructs';

/**
 * Base properties for all Ferment constructs
 */
export interface FermentConstructProps {
  /**
   * Optional description for the construct
   */
  description?: string;
}

/**
 * Base class for all Ferment constructs
 * 
 * This class extends the AWS CDK Construct class and provides
 * common functionality for all Ferment constructs.
 */
export abstract class FermentConstruct extends Construct {
  /**
   * Optional description for the construct
   */
  public readonly description?: string;

  /**
   * Creates a new instance of the FermentConstruct class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: FermentConstructProps = {}) {
    super(scope, id);
    this.description = props.description;
  }

  /**
   * Returns a string representation of this construct
   */
  public override toString(): string {
    return `${this.node.id}${this.description ? ` (${this.description})` : ''}`;
  }
}