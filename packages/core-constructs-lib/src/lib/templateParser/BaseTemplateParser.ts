import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { RENDER_TEMPLATE_TASK_DEF } from "./BaseTemplateParserTaskDefs.js";

export abstract class BaseTemplateParser extends WorkflowTask<typeof RENDER_TEMPLATE_TASK_DEF.inputType, typeof RENDER_TEMPLATE_TASK_DEF.outputType> {
  public override taskDef = RENDER_TEMPLATE_TASK_DEF;

  constructor(scope: Construct, id: string, props = {}) {
    super(scope, id, props);
  }
}