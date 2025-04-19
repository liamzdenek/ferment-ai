import { WorkflowTask } from "@ferment-ai/runtime-common";
import { CAPABLE_WORKFLOW_TASK_DEF } from "./CapableWorkflowTaskDefs.js";

export abstract class CapableWorkflowTask extends WorkflowTask<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof CAPABLE_WORKFLOW_TASK_DEF.outputType> {
  public override taskDef = CAPABLE_WORKFLOW_TASK_DEF;
}