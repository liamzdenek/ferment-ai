import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, LLMGate, OllamaModel, StructuredOutputCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestLLMGate extends TestConstruct {
  public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
    messages: [
      {
        role: 'system',
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "Rate how happy this sentence is on a scale of 1-10: 'I just won the lottery!'"
      }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a model for testing
    const testModel = new OllamaModel(this, 'TestModel', {
      host: "ollama:11434",
      modelName: "deepseek-r1:8b",
      // modelName: "llama3.1:70b",
    });

    // Create a capability parser for the model
    const capabilityParser = new StructuredOutputCapabilityParser(this, 'StructuredOutputCapabilityParser');

    // Create a capable model
    const capableModel = new CapableModel(this, 'CapableModel', {
      model: testModel,
      capabilities: [],
      capabilityParser
    });

    // Create a range-based gate that passes if score is between 7 and 10
    const rangeGate = new LLMGate(this, 'RangeGate', {
      model: capableModel,
      prompt: "Please analyze the sentiment of the text and provide a score from 1-10 where 1 is very negative and 10 is very positive. Return only a JSON object with a 'score' field.",
      condition: {
        type: "pass_if_in_range",
        gte: 7,      // Pass if score >= 7
        lte: 10,     // Pass if score <= 10
        min: 1,      // Minimum valid score
        max: 10      // Maximum valid score
      }
    });

    // Create a workflow for the range gate
    const rangeGateWorkflow = new Workflow(this, 'RangeGateWorkflow', {
      definition: rangeGate
    });

    // Create a regex-based gate that passes if the response contains the word "happy"
    const regexGate = new LLMGate(this, 'RegexGate', {
      model: capableModel,
      prompt: "Describe the emotion in this sentence: 'I just won the lottery!'",
      condition: {
        type: "pass_if_regex_matches",
        regex: "happy|joy|excited|ecstatic"
      }
    });

    // Create a workflow for the regex gate
    const regexGateWorkflow = new Workflow(this, 'RegexGateWorkflow', {
      definition: regexGate
    });
  }
}
