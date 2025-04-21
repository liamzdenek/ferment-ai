import { EXECUTE_CAPABILITY_TASK_DEF, MCPCapability } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';
import path from 'path';

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
    /*
    public override testPrompt: z.infer<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType> = {
        type: "tool",
        name: "calculate-bmi",
        arguments: {
            "weightKg": 400,
            "heightM": 1.2
        }
    };
    */
    public override testPrompt: z.infer<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType> = {
        type: "resource",
        name: "dadjoke",
        uri: "dadjoke://get"
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);


        const mcp = new MCPCapability(this, 'MCPCapability', {
            transport: {
                type: 'stdio',
                command: 'node',
                args: [path.join(process.cwd(), './packages/dad-joke-mcp/dist/main.js')]
            }
        });

        const _workflow = new Workflow(this, 'Workflow', {
            definition: mcp.executeCapability
        });
    }
}
