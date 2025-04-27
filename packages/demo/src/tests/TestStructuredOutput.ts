import { CapableModel, OllamaModel, STRUCTURED_OUTPUT_TASK_DEF, StructuredOutput, StructuredOutputCapabilityParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';
import { MOCK_HTML } from './TestStructuredOutput.strings.js';

export class TestStructuredOutput extends TestConstruct {
    public override testPrompt: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType> = {
        messages: [
            {
                role: 'system',
                content: "You must try to use a tool, resource, or prompt to answer the user's inquiry, if one is a match. "+
                    "You must rely on the tool's output to answer the user's inquiry."
            },
            {
              role: "user",
              content: MOCK_HTML+"\n\n---\n\n"+
                "Read the above page. Then, return structured_output with the accountholderName, accountType, currentBalance, mostRecentDepositAmount, and mostRecentWithdrawalAmount."
            }
        ]
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const testModel = new OllamaModel(this, 'TestModel', {
            host: "ollama:11434",
            modelName: "deepseek-r1:8b"
        });

        const capabilityParser = new StructuredOutputCapabilityParser(this, "CapabilityParser", {});

        const capableModel = new CapableModel(this, "CapableModel", {
            model: testModel,
            capabilities: [],
            capabilityParser
        })

        const so = new StructuredOutput(this, "StructuredOutput", {
            capableTask: capableModel,
            outputType: z.strictObject({
                accountholderName: z.string(),
                accountType: z.string(),
                currentBalance: z.number(),
                mostRecentDepositAmount: z.number().min(0),
                mostRecentWithdrawalAmount: z.number().max(0)
            })
        })

        const _workflow = new Workflow(this, 'Workflow', {
            definition: so
        });
    }
}
