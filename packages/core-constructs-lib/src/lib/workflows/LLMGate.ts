import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { z } from "zod";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { CapableModel } from "../capabilities/CapableModel.js";

export interface LLMGateConditionRegex {
  type: "pass_if_regex_matches" | "fail_if_regex_matches"
  regex: string
}

export interface LLMGateConditionRange {
  type: "pass_if_in_range" | "fail_if_in_range"
  lte: number;
  gte: number;
  min: number;
  max: number;
}

export interface GateProps {
  model: CapableModel,
  prompt: string | BaseTemplateParser
  condition: LLMGateConditionRegex | LLMGateConditionRange
}

export class LLMGate extends CapableWorkflowTask {
  public readonly props: GateProps;

  constructor(
    scope: Construct,
    id: string,
    props: GateProps
  ) {
    super(scope, id, {})
    this.props = props;
  }

  override getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getTools(),
      ...(typeof this.props.prompt === 'string' ? {} : {
        [this.props.prompt.node.id]: this.props.prompt
      }),
      [this.props.model.node.id]: this.props.model
    };
  }
}