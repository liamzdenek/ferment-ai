import { Construct } from 'constructs';
import { FermentConstruct, FermentConstructProps } from './base-construct.js';
import { SendEmailTool } from './send-email-tool.js';
import { Workflow, TaskDef, WorkflowTask, WorkflowTaskOptions } from '@ferment-ai/runtime-common';
import { AGENT_CONTEXT_TASK_DEF, PROMPT_TASK_DEF } from './task-defs.js';
import { z } from 'zod';

/**
 * Properties for the AgentContext construct
 */
export interface AgentContextProps extends FermentConstructProps {
  /**
   * The prompt template for the agent
   */
  readonly prompt: string;

  /**
   * The context window size for the agent
   * @default 4000
   */
  readonly contextWindowSize?: number;

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
   * The task definition for this agent context
   */
  public readonly taskDef = AGENT_CONTEXT_TASK_DEF;

  /**
   * The context window size for the agent
   */
  private readonly _contextWindowSize: number;

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
    super(scope, id);
    this.prompt = props.prompt;
    this.model = props.model;
    this._contextWindowSize = props.contextWindowSize ?? 4000;

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
   * Gets the context window size for the agent
   */
  public get contextWindowSize(): number {
    return this._contextWindowSize;
  }

  /**
   * Creates a new prompt task for this agent
   *
   * @param scope The scope in which to define the task
   * @param id The task's identifier
   * @param options The task options
   * @returns A new prompt task
   */
  public newPromptTask(scope: Construct, id: string, options?: Partial<WorkflowTaskOptions>): PromptTask {
    return new PromptTask(scope, id, this, options);
  }
}

/**
 * A specialized task for agent prompts that can create email tools
 */
export class PromptTask extends WorkflowTask {
  /**
   * The agent context this task belongs to
   */
  private readonly agentContext: AgentContext;

  /**
   * Creates a new prompt task
   *
   * @param scope The scope in which to define the task
   * @param id The task's identifier
   * @param agentContext The agent context this task belongs to
   * @param options The options for the task
   */
  constructor(
    scope: Construct,
    id: string,
    agentContext: AgentContext,
    options?: Partial<WorkflowTaskOptions>
  ) {
    super(scope, id, {
      taskDef: PROMPT_TASK_DEF,
      description: `Prompt task for ${agentContext.node.id}`,
      ...options
    });
    this.agentContext = agentContext;
  }

  /**
   * Creates a tool that can be used to send an email to this agent
   *
   * @returns A task that can be used as a tool
   */
  sendEmailTool(): WorkflowTask {
    // Create a task wrapper for the tool
    const emailToolTask = new WorkflowTask(this, `${this.node.id}SendEmailTool`, {
      taskDef: {
        taskDefId: 'send-email-tool',
        inputType: z.any(),
        outputType: z.any()
      },
      description: `Send an email to ${this.agentContext.node.id}`
    });

    return emailToolTask;
  }
}