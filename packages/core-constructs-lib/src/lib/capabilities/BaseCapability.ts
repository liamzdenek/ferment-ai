import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { EXECUTE_CAPABILITY_TASK_DEF, GET_AVAILABLE_CAPABILITIES_TASK_DEF } from "./BaseCapabilityTaskDefs.js";
import { z } from "zod";


export abstract class BaseCapability extends Construct {
  public abstract getAvailableCapabilities: WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>;

  public abstract executeCapability: WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>;

  // TODO? maybe prePromptTransform and postPromptTransform? How is CodeAct going to work exactly? not sure.

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  // even though BaseCapability isn't itself callable... it's made up of callable things
  // so we're adding this convenience function for callers to easily rely on all of the necessary tasks in a capability
  getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      [this.executeCapability.node.path]: this.executeCapability,
      [this.getAvailableCapabilities.node.path]: this.getAvailableCapabilities
    };
  }
}