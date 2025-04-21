import { CapableModel, Chain, ChainQualityGate, GET_AVAILABLE_CAPABILITIES_TASK_DEF, MCPCapability, OllamaModel, TagCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestChain extends TestConstruct {
    public override testPrompt: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType> = null;

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

        const chain = new Chain(this, 'Chain');
        chain.pushLink(capableModel.withTransientMessage)

        chain.pushLink({ capableTask: capableModel, messages: [{
            "role": "user",
            "content": "Review the provided contract for any legal concerns. Be verbose and include every possible concern."
        }]});
        chain.pushLink({ capableTask: new ChainQualityGate(this, 'Gate', {}), messages: [{
            "role": "user",
            "content": "Respond 'APPROVED' if the message meets all the criteria. It must contain at least 10 legal concerns. It must be well-formatted. It must explain the reason for each concern in addition to the specific location of the concern."
        }] })
        chain.pushLink({ capableTask: capableModel, messages: [{
            "role": "user",
            "content": "Group the provided legal concerns into relevant topics, and include the most important items at the top of each topic. Put a summary at the top"
        }]});
        chain.pushLink({ capableTask: capableModel, messages: [{
            "role": "user",
            "content": "Translate the message into French."
        }]});

        const _workflow = new Workflow(this, 'Workflow', {
            definition: chain
        });
    }
}
