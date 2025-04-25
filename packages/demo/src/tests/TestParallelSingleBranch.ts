import { Construct } from "constructs";
import { 
  CapableModel, 
  OllamaModel, 
  Parallel, 
  DotTemplateParser, 
  StructuredOutputCapabilityParser,
  EditMessagesTask
} from "@ferment-ai/core-constructs-lib";
import { Workflow } from "@ferment-ai/runtime-common";
import { TestConstruct } from "../TestConstruct.js";

export class TestParallelSingleBranch extends TestConstruct {
  public readonly testPrompt = {
    messages: [
      {
        role: "user",
        content: "What is the capital of France?"
      }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a capability parser for structured output
    const capabilityParser = new StructuredOutputCapabilityParser(this, "CapabilityParser", {});

    // Create a model for the aggregator
    const aggregatorModel = new OllamaModel(this, 'AggregatorModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    // Create a capable model for the aggregator
    const aggregatorCapableModel = new CapableModel(this, "AggregatorCapableModel", {
      model: aggregatorModel,
      capabilities: [],
      capabilityParser
    });

    // Create a simple EditMessagesTask that appends "Hello World" as a new message
    const appendHelloWorldTask = new EditMessagesTask(this, 'AppendHelloWorld', {
      messagesPush: [
        { role: 'assistant', content: 'Hello World' }
      ]
    });

    // Create a simple template for the aggregator that just passes through the result
    const aggregationTemplate = new DotTemplateParser(this, "AggregationTemplate", {
      template: `
This is a simple passthrough template.

Original input: {{=it.originalInput.messages[0].content}}

Result from the single branch:
{{=it.results[0].messages[it.results[0].messages.length-1].content}}

Just return the result from the single branch without modification.
      `
    });

    // Create the parallel construct with a single branch
    const parallel = new Parallel(this, 'ParallelProcessor', {
      parallelTasks: [
        appendHelloWorldTask
      ],
      aggregator: aggregatorCapableModel,
      aggregationTemplate: aggregationTemplate
    });

    // Create a workflow with the parallel construct
    const workflow = new Workflow(this, 'Workflow', {
      definition: parallel
    });
  }
}