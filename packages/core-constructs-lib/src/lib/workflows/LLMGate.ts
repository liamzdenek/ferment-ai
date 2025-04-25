import { Construct } from "constructs";
import { z } from "zod";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { CapableModel } from "../capabilities/CapableModel.js";
import { StructuredOutput } from "../structuredOutput/StructuredOutput.js";
import { WorkflowTask } from "@ferment-ai/runtime-common";

export interface LLMGateConditionRegex {
  type: "pass_if_regex_matches" | "fail_if_regex_matches"
  regex: string
  structuredOutput: StructuredOutput<typeof LLMGateStringOutput>
}

export interface LLMGateConditionRange {
  type: "pass_if_in_range" | "fail_if_in_range"
  lte: number;
  gte: number;
  min: number;
  max: number;
  structuredOutput: StructuredOutput<typeof LLMGateRangeOutput>
}

const LLMGateStringOutput = z.strictObject({
  analysis: z.string()
})

const LLMGateRangeOutput = z.strictObject({
  score: z.number()
})

export interface LLMGateProps {
  prompt: string | BaseTemplateParser,
  condition: LLMGateConditionRegex | LLMGateConditionRange,
}

// Input props derived from LLMGateProps with output made optional
export type LLMGatePropsInputCapableModel = Omit<LLMGateProps, 'condition'> & {
  condition: Omit<LLMGateConditionRegex, 'structuredOutput'> | Omit<LLMGateConditionRange, 'structuredOutput'>
  capableModel: CapableModel
}
export class LLMGate extends CapableWorkflowTask {
  public readonly props: LLMGateProps;

  constructor(
    scope: Construct,
    id: string,
    input: LLMGatePropsInputCapableModel | LLMGateProps
  ) {
    super(scope, id, {})

    if ('capableModel' in input) {
      const { capableModel, ...restInput } = input;
      if (input.condition.type === 'pass_if_in_range' || input.condition.type === 'fail_if_in_range') {
        const structuredOutput = new StructuredOutput(this, 'StructuredOutput', {
          outputType: LLMGateRangeOutput,
          capableModel: capableModel
        });
        this.props = {
          ...restInput,
          condition: {
            ...input.condition,
            structuredOutput
          }
        };
      } else if (input.condition.type === 'fail_if_regex_matches' || input.condition.type === 'pass_if_regex_matches') {
        const structuredOutput = new StructuredOutput(this, 'StructuredOutput', {
          outputType: LLMGateStringOutput,
          capableModel: capableModel
        });
        this.props = {
          ...restInput,
          condition: {
            ...input.condition,
            structuredOutput
          }
        };
      } else {
        throw new Error("Invariant: expected you to pass in either props.condition.structuredOutput, or props.capableModel. Couldn't find either")
      }
    } else {
      this.props = {
        ...input,
        condition: input.condition // this looks unnecessary but typescript only promotes the type of 'input.condition' with the guard, not input as a whole
      }
    }
  }

  override getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getReachableTasks(),
      [this.props.condition.structuredOutput.node.id]: this.props.condition.structuredOutput
    };
  }
}