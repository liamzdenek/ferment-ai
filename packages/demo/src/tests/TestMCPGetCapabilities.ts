import { GET_AVAILABLE_CAPABILITIES_TASK_DEF, MCPCapability } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestMCPGetCapabilities extends TestConstruct {
    public override testPrompt: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType> = null;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const mcp = new MCPCapability(this, 'MCPCapability', {
            transport: {
                type: 'http',
                uri: "http://localhost:7000/mcp"
            }
        });

        const workflow = new Workflow(this, 'Workflow', {
            definition: mcp.getAvailableCapabilities
        });
    }
}
