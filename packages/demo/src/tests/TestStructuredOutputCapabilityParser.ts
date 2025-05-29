import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, MCPCapability, OllamaModel, StructuredOutputCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';
import path from 'path';

export class TestStructuredOutputCapabilityParser extends TestConstruct {
  public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
    messages: [
      {
        role: 'system',
        content: "You must try to use a tool, resource, or prompt to answer the user's inquiry, if one is a match. " +
          "You must rely on the tool's output to answer the user's inquiry. The user cannot see the tool result, so you should repeat it back to them. You must not write an original joke, you must rely on the MCP result."
      },
      {
        role: "user",
        content: "Can you search for a dad joke about hipsters?"
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
        type: 'stdio',
        command: 'node',
        args: [path.join(process.cwd(), './packages/dad-joke-mcp/dist/main.js')]
      }
    });

    // Create a single tool use capability parser (default)
    const singleToolParser = new StructuredOutputCapabilityParser(this, 'StructuredOutputCapabilityParser');

    const singleToolModel = new CapableModel(this, 'SingleToolModel', {
      model: testModel,
      capabilities: [mcp],
      capabilityParser: singleToolParser
    });

    const _singleToolWorkflow = new Workflow(this, 'SingleToolWorkflow', {
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