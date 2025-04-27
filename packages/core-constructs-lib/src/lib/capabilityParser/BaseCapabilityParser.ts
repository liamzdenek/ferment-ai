
import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF } from "./BaseCapabilityParserTaskDefs.js";
import { z } from "zod";

export abstract class BaseCapabilityParser extends Construct {
  public abstract formatPrompt: WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>;
  public abstract parseModelResponse: WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>;

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  // CapableModel needs to be able to use all of its tools, and the model.
  getReachableTasks(): [string, string][] {
    return [
      [this.node.path, this.formatPrompt.node.path],
      [this.node.path, this.parseModelResponse.node.path],
    ];
  }
}