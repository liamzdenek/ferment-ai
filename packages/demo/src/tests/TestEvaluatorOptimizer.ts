import { Construct } from "constructs";
import { Workflow } from "@ferment-ai/runtime-common";
import {
  CapableModel,
  DotTemplateParser,
  EvaluatorOptimizer,
  OllamaModel,
  StructuredOutputCapabilityParser
} from '@ferment-ai/core-constructs-lib';
import { TestConstruct } from "../TestConstruct.js";

export class TestEvaluatorOptimizer extends TestConstruct {
  public readonly testPrompt = {
    messages: [
      {
        role: "user",
        content: "Explain the concept of quantum computing to a high school student."
      }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create models
    const optimizerModel = new OllamaModel(this, 'OptimizerModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    const evaluatorModel = new OllamaModel(this, 'EvaluatorModel', {
      host: "ollama:11434",
      modelName: "llama3.1:8b",
    });

    // Create capability parsers
    const optimizerCapabilityParser = new StructuredOutputCapabilityParser(this, "OptimizerCapabilityParser", {});
    const evaluatorCapabilityParser = new StructuredOutputCapabilityParser(this, "EvaluatorCapabilityParser", {});

    // Create capable models
    const optimizerCapableModel = new CapableModel(this, "OptimizerCapableModel", {
      model: optimizerModel,
      capabilities: [],
      capabilityParser: optimizerCapabilityParser
    });

    const evaluatorCapableModel = new CapableModel(this, "EvaluatorCapableModel", {
      model: evaluatorModel,
      capabilities: [],
      capabilityParser: evaluatorCapabilityParser
    });

    // Create template parsers
    const evaluatorTemplate = new DotTemplateParser(this, "EvaluatorTemplate", {
      template: `
        You are an expert evaluator. Your task is to evaluate the quality of the response to the given prompt.

        Original prompt:
        {{=it.originalPrompt}}

        Response to evaluate:
        {{=it.response}}

        Provide a score from 1-10 where:
        1-3: Poor quality, major issues
        4-6: Average quality, some issues
        7-8: Good quality, minor issues
        9-10: Excellent quality, no significant issues

        Also provide specific, actionable feedback on how to improve the response.

        Return your evaluation as a JSON object with the following fields:
        - score: A number between 1 and 10
        - feedback: A string with specific, actionable feedback
        - shouldContinue: A boolean indicating whether the response needs further improvement (true) or is good enough (false)
      `,
      stripWhitespace: false
    });

    const optimizerTemplate = new DotTemplateParser(this, "OptimizerTemplate", {
      template: `
        You are tasked with generating a high-quality response to the following prompt:

        {{=it.originalPrompt}}

        {{? it.feedback}}
        Here is feedback on your previous attempt:
        Score: {{=it.score}}/10
        Feedback: {{=it.feedback}}

        Please improve your response based on this feedback.
        {{?}}

        Provide a comprehensive, well-structured response that addresses all aspects of the prompt.
      `,
      stripWhitespace: false
    });

    // Create evaluator optimizer
    const evaluatorOptimizer = new EvaluatorOptimizer(this, 'EvaluatorOptimizer', {
      optimizerTask: optimizerCapableModel,
      evaluatorTask: evaluatorCapableModel,
      evaluatorTemplate: evaluatorTemplate,
      optimizerTemplate: optimizerTemplate,
      iterationHardLimit: 3,
      targetScore: 8
    });

    // Create workflow
    const _workflow = new Workflow(this, 'Workflow', {
      definition: evaluatorOptimizer
    });
  }
}