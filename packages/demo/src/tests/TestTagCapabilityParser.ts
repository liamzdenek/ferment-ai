import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, MCPCapability, OllamaModel, StructuredOutputCapabilityParser, TagCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';
import path from 'path';

export class TestTagCapabilityParser extends TestConstruct {
    public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        messages: [
            {
                role: 'system',
                content: "You must try to use a tool, resource, or prompt to answer the user's inquiry, if one is a match. "+
                    "You must rely on the tool's output to answer the user's inquiry."
            },
            {
                role: "user",
                content: "Can you search for a dad joke about hipsters?"
            }
        ]
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        /**
         * FYI: The tag capability parser is SUPER flaky with these tiny models
         * llama3.1 8b / deepseek-r1 8b are included just to show a cheap sample but
         * in practice the TagCapabilityParser requires a much larger model
         * 
         * For these small models, consider StructuredOutputCapabilityParser
         * see: TestStructuredOutputCapabilityParser.ts
         */
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
