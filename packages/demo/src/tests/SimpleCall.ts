import { INVOKE_MODEL_TASK_DEF, OllamaModel } from "@ferment-ai/core-constructs-lib";
import { Workflow } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { TestConstruct } from "../TestConstruct.js";
import { z } from "zod";

export class SimpleCall extends TestConstruct {
  public override testPrompt: z.infer<typeof INVOKE_MODEL_TASK_DEF.inputType> = {
    messages: [
      { role: "user", content: "Hello world!" }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const testModel = new OllamaModel(this, 'TestModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b"
    });

    const workflow = new Workflow(this, 'Workflow', {
      definition: testModel
    });
  }
}