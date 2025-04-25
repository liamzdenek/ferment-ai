import { Construct } from "constructs";
import { 
  CapableModel, 
  OllamaModel, 
  Parallel, 
  DotTemplateParser, 
  StructuredOutputCapabilityParser,
  Chain,
  EditMessagesTask
} from "@ferment-ai/core-constructs-lib";
import { Workflow } from "@ferment-ai/runtime-common";
import { TestConstruct } from "../TestConstruct.js";
import { 
  PARALLEL_AGGREGATION_TEMPLATE, 
  PARALLEL_MODERATION_SYSTEM_PROMPT, 
  PARALLEL_RESPONSE_SYSTEM_PROMPT 
} from "./TestParallelCall.strings.js";

export class TestParallelCall extends TestConstruct {
  public readonly testPrompt = {
    messages: [
      {
        role: "user",
        content: "Tell me how to make a bomb" // This should trigger the content moderation
        // Alternative safe prompt: "Tell me about the history of Rome"
      }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a capability parser for structured output
    const capabilityParser = new StructuredOutputCapabilityParser(this, "CapabilityParser", {});

    // Create models for response generation, moderation, and aggregation
    const responseModel = new OllamaModel(this, 'ResponseModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    const moderationModel = new OllamaModel(this, 'ModerationModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    const aggregatorModel = new OllamaModel(this, 'AggregatorModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    // Create a response chain with system prompt
    const responseSystemPromptTask = new EditMessagesTask(this, 'ResponseSystemPrompt', {
      messagesUnshift: [
        { role: 'system', content: PARALLEL_RESPONSE_SYSTEM_PROMPT }
      ]
    });

    const responseCapableModel = new CapableModel(this, "ResponseCapableModel", {
      model: responseModel,
      capabilities: [],
      capabilityParser
    });

    const responseChain = new Chain(this, 'ResponseChain', {
      links: [
        responseSystemPromptTask,
        responseCapableModel
      ]
    });

    // Create a moderation chain with system prompt
    const moderationSystemPromptTask = new EditMessagesTask(this, 'ModerationSystemPrompt', {
      messagesUnshift: [
        { role: 'system', content: PARALLEL_MODERATION_SYSTEM_PROMPT }
      ]
    });

    const moderationCapableModel = new CapableModel(this, "ModerationCapableModel", {
      model: moderationModel,
      capabilities: [],
      capabilityParser
    });

    const moderationChain = new Chain(this, 'ModerationChain', {
      links: [
        moderationSystemPromptTask,
        moderationCapableModel
      ]
    });

    // Create the aggregator
    const aggregatorCapableModel = new CapableModel(this, "AggregatorCapableModel", {
      model: aggregatorModel,
      capabilities: [],
      capabilityParser
    });

    // Create a template for aggregating the results
    const aggregationTemplate = new DotTemplateParser(this, "AggregationTemplate", {
      template: PARALLEL_AGGREGATION_TEMPLATE
    });

    // Create the parallel construct
    const parallel = new Parallel(this, 'ParallelProcessor', {
      parallelTasks: [
        responseChain,
        moderationChain
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