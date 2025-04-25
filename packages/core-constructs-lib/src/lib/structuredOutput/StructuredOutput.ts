import { Construct } from "constructs";
import { z, ZodTypeAny } from "zod";
import { CapableModel } from "../capabilities/CapableModel.js";
import { StructuredOutputCapability } from "./StructuredOutputCapability.js";
import { STRUCTURED_OUTPUT_TASK_DEF } from "./StructuredOutputTaskDefs.js";
import { WorkflowTask } from "@ferment-ai/runtime-common";

export interface StructuredOutputProps<T extends ZodTypeAny> {
  outputType: T,
  capableModel: CapableModel,
}

export class StructuredOutput<T extends ZodTypeAny> extends WorkflowTask<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType, typeof STRUCTURED_OUTPUT_TASK_DEF.outputType> {
  public override taskDef = STRUCTURED_OUTPUT_TASK_DEF;

  public structuredOutputCapability: StructuredOutputCapability;

  constructor(
    scope: Construct,
    id: string,
    public props: StructuredOutputProps<T>
  ) {
    super(scope, id, {})

    this.structuredOutputCapability = new StructuredOutputCapability(this, 'StructuredOutputCapability', {
      asType: this.props.outputType
    })

    this.props.capableModel.pushCapability(this.structuredOutputCapability)
  }
    
  override getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getReachableTasks(),
      [this.props.capableModel.node.path]: this.props.capableModel
    };
  }
}