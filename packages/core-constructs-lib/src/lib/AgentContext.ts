import { Construct } from 'constructs';
import { WorkflowTask } from '@ferment-ai/runtime-common';
import { z } from 'zod';
import { INVOKE_MODEL_TASK_DEF } from './models/BaseModelTaskDefs.js';
import { AGENT_CONTEXT_TASK_DEF } from './AgentContextTaskDef.js';

/**
 * Properties for the AgentContext construct
 */
export interface AgentContextProps {
  /**
   * The prompt template for the agent
   */
  initialMessages: z.infer<typeof AGENT_CONTEXT_TASK_DEF.inputType>['messages'][];

  /**
   * The context window size for the agent
   * @default 4000
   */
  contextWindowSize?: number;

  /**
   * The model to use for the agent
   */
  model: WorkflowTask<typeof INVOKE_MODEL_TASK_DEF.inputType, typeof INVOKE_MODEL_TASK_DEF.outputType>;

  /**
   * Optional tools for the agent
   */
  tools?: Construct[];
}

/**
 * An AgentContext represents an environment for a single agent
 * 
 * It contains the agent's prompt, tool call parser, tool use invoker, list of tools
 * persistent conversation/context, maximum context length, and persistence rules.
 */
export class AgentContext extends WorkflowTask<typeof AGENT_CONTEXT_TASK_DEF.inputType, typeof AGENT_CONTEXT_TASK_DEF.outputType> {
  public readonly props: AgentContextProps;

  public override readonly taskDef = AGENT_CONTEXT_TASK_DEF;

  constructor(scope: Construct, id: string, props: AgentContextProps) {
    super(scope, id, {});
    this.props = props;
  }

  override getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getTools(),
      // the selected model needs to be usable as a tool
      // adding it here informs the compiler that it may appear in the call graph
      [this.props.model.node.path]: this.props.model
    };
  }
}
