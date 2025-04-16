import { Construct } from 'constructs';
import { FermentConstruct, FermentConstructProps } from './base-construct.js';
import { MODEL_TASK_DEF, OPENAI_MODEL_TASK_DEF } from './task-defs.js';

/**
 * Properties for the Model construct
 */
export interface ModelProps extends FermentConstructProps {
  /**
   * The model identifier (e.g., "gpt-4", "claude-3-opus")
   */
  readonly model: string;

  /**
   * Optional API key for the model provider
   */
  readonly apiKey?: string;

  /**
   * Optional base URL for the model provider
   */
  readonly baseUrl?: string;

  /**
   * Optional model parameters
   */
  readonly parameters?: Record<string, any>;
}

/**
 * A Model represents an LLM provider
 * 
 * It contains the configuration for interacting with a specific
 * language model, such as the model identifier, API key, and
 * other parameters.
 */
export abstract class Model extends FermentConstruct {
  /**
   * The model identifier
   */
  public readonly modelId: string;

  /**
   * The task definition for this model
   */
  public readonly taskDef = MODEL_TASK_DEF;

  /**
   * The API key for the model provider
   */
  protected readonly apiKey?: string;

  /**
   * The base URL for the model provider
   */
  protected readonly baseUrl?: string;

  /**
   * The model parameters
   */
  protected readonly parameters: Record<string, any>;

  /**
   * Creates a new instance of the Model class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ModelProps) {
    super(scope, id, props);
    this.modelId = props.model;
    this.apiKey = props.apiKey;
    this.baseUrl = props.baseUrl;
    this.parameters = props.parameters ?? {};
  }
}

/**
 * Properties for the OpenAIModel construct
 */
export interface OpenAIModelProps extends ModelProps {
  /**
   * Optional organization ID for the OpenAI API
   */
  readonly organizationId?: string;
}

/**
 * An OpenAIModel represents an OpenAI language model
 */
export class OpenAIModel extends Model {
  /**
   * The task definition for this OpenAI model
   */
  public override readonly taskDef = OPENAI_MODEL_TASK_DEF;

  /**
   * The organization ID for the OpenAI API
   */
  private readonly organizationId?: string;

  /**
   * Creates a new instance of the OpenAIModel class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: OpenAIModelProps) {
    super(scope, id, props);
    this.organizationId = props.organizationId;
  }
}

/**
 * Properties for the AnthropicModel construct
 */
export interface AnthropicModelProps extends ModelProps {
  /**
   * Optional version of the Anthropic API
   */
  readonly apiVersion?: string;
}

/**
 * An AnthropicModel represents an Anthropic language model
 */
export class AnthropicModel extends Model {
  /**
   * The task definition for this Anthropic model
   */
  public override readonly taskDef = MODEL_TASK_DEF;

  /**
   * The version of the Anthropic API
   */
  private readonly apiVersion?: string;

  /**
   * Creates a new instance of the AnthropicModel class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: AnthropicModelProps) {
    super(scope, id, props);
    this.apiVersion = props.apiVersion;
  }
}