import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, MCPCapability, OllamaModel, TagCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestCapableModel extends TestConstruct {
    public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        messages: [
            {
                role: "user",
                content: "What is the BMI of a person that weighs 400 kilograms and is 120 cm high?"
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

        const capabilityParser = new TagCapabilityParser(scope, "CapabilityParser", {});

        const capableModel = new CapableModel(scope, "CapableModel", {
            model: testModel,
            capabilities: [mcp],
            capabilityParser
        })

        const _workflow = new Workflow(this, 'Workflow', {
            definition: capableModel
        });
    }
}
