import { EXECUTE_CAPABILITY_TASK_DEF, MCPCapability } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestMCPExecuteCapability extends TestConstruct {
    /*
    public override testPrompt: z.infer<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType> = {
        type: "prompt",
        name: "review-code",
        arguments: {
            "code": "Math.floor(100 / 0) * 30"
        }
    };
    */
    public override testPrompt: z.infer<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType> = {
        type: "tool",
        name: "calculate-bmi",
        arguments: {
            "weightKg": 400,
            "heightM": 1.2
        }
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const mcp = new MCPCapability(this, 'MCPCapability', {
            transport: {
                type: 'http',
                uri: "http://localhost:7000/mcp"
            }
        });

        const _workflow = new Workflow(this, 'Workflow', {
            definition: mcp.executeCapability
        });
    }
}
