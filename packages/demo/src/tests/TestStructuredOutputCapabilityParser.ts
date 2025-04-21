import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, MCPCapability, OllamaModel, StructuredOutputCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestStructuredOutputCapabilityParser extends TestConstruct {
  public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
    messages: [
      {
        role: "user",
        content: "What is the BMI of a person that weighs 400 kilograms and is 120 cm high? Use the calculator tool."
      }
    ]
  };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const testModel = new OllamaModel(this, 'TestModel', {
      host: "ollama:11434",
      modelName: "deepseek-r1:8b"
  });

    const mcp = new MCPCapability(this, 'MCPCapability', {
      transport: {
          type: 'http',
          uri: "http://localhost:7000/mcp"
      }
    });
    
    // Create a single tool use capability parser (default)
    const singleToolParser = new StructuredOutputCapabilityParser(this, 'SingleToolParser');

    const singleToolModel = new CapableModel(this, 'SingleToolModel', {
      model: testModel,
      capabilities: [mcp],
      capabilityParser: singleToolParser
    });

    const singleToolWorkflow = new Workflow(this, 'SingleToolWorkflow', {
      definition: singleToolModel
    });

    /*
    // Create a multiple tool use capability parser
    const multiToolParser = new StructuredOutputCapabilityParser(this, 'MultiToolParser', {
        allowMultipleToolUses: true
    });

    const multiToolModel = new CapableModel(this, 'MultiToolModel', {
        model: testModel,
        capabilities: [mcp],
        capabilityParser: multiToolParser
    });

    const multiToolWorkflow = new Workflow(this, 'MultiToolWorkflow', {
        definition: multiToolModel
    });
    */
  }
}