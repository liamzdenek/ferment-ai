import { WorkflowError, WorkflowErrorOptions, WorkflowTask } from "@ferment-ai/runtime-common";
import { BaseCapability } from "../capabilities/BaseCapability.js";
import { GET_AVAILABLE_CAPABILITIES_TASK_DEF, EXECUTE_CAPABILITY_TASK_DEF } from "../capabilities/BaseCapabilityTaskDefs.js";
import { Construct } from "constructs";
import { z } from "zod";

interface StructuredOutputCapabilityProps {
  asType: z.ZodTypeAny
}

interface StructuredOutputCapabilityTaskProps {
  parentConstruct: StructuredOutputCapability
}

export class StructuredOutputCapabilityError extends WorkflowError {
  constructor(message: string, options: WorkflowErrorOptions = {}, public structuredData: unknown) {
    super(message, options);
  }
}

export class StructuredOutputCapability extends BaseCapability {
  public getAvailableCapabilities: WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>;
  public executeCapability: WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>;

  public readonly props: StructuredOutputCapabilityProps;

  constructor(scope: Construct, id: string, props: StructuredOutputCapabilityProps) {
    super(scope, id);
    this.props = props;
    const subProps: StructuredOutputCapabilityTaskProps = {
      parentConstruct: this
    }
    this.getAvailableCapabilities = new StructuredOutputCapabilityGetAvailableCapabilities(this, 'GetAvailableCapabilities', subProps);
    this.executeCapability = new StructuredOutputCapabilityExecuteCapability(this, 'ExecuteCapability', subProps);
  }
}

export class StructuredOutputCapabilityGetAvailableCapabilities extends WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> {
  public override taskDef = GET_AVAILABLE_CAPABILITIES_TASK_DEF;

  constructor(scope: Construct, id: string, public props: StructuredOutputCapabilityTaskProps) {
    super(scope, id, {});
  }
}

export class StructuredOutputCapabilityExecuteCapability extends WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType> {
  public override taskDef = EXECUTE_CAPABILITY_TASK_DEF;

  constructor(scope: Construct, id: string, public props: StructuredOutputCapabilityTaskProps) {
    super(scope, id, {});
  }
}