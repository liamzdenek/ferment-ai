import { CAPABLE_WORKFLOW_TASK_DEF, CapableModel, Chain, MCPCapability, OllamaModel, EditMessagesTask, StructuredOutputCapabilityParser, LLMGate } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';
import path from 'path';

const TEST_EMAIL = `
Sam,

Thinking about AI safety. Want to start company together called OpenAI. Non-profit research lab. Goal: ensure AGI benefits humanity.

Basic plan:
- Assemble top talent
- Open source approach
- Secure initial $1B funding
- Begin work immediately

Available to discuss Tuesday. Can meet at my office or yours.

-Elon

Sent from my iPhone
`.trim();

export class TestChain extends TestConstruct {
    public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant. A user is going to ask you to help with some of their work tasks, and you should helpfully contribute."
            },
            {
                role: "user",
                content: TEST_EMAIL
            }
        ]
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const testModel = new OllamaModel(this, 'TestModel', {
            host: "ollama:11434",
            modelName: "llama3.1:70b",
        });

        const mcp = new MCPCapability(this, 'MCPCapability', {
            transport: {
              type: 'stdio',
              command: 'node',
              args: [path.join(process.cwd(), './packages/dad-joke-mcp/dist/main.js')]
            }
        });

        const capabilityParser = new StructuredOutputCapabilityParser(this, "CapabilityParser", {});

        const capableModelWithDadJokeMcp = new CapableModel(this, "CapableModelWithMcps", {
            model: testModel,
            capabilities: [mcp],
            capabilityParser
        })

        const capableModelWithoutMcps = new CapableModel(this, "CapableModelWithoutMcps", {
            model: testModel,
            capabilities: [],
            capabilityParser
        })

        const capableModelForConfirmingDadJoke = new CapableModel(this, "CapableModelForConfirmingDadJoke", {
            model: testModel,
            capabilities: [],
            capabilityParser
        });

        const chain = new Chain(this, 'Chain');
        chain.pushLink(new EditMessagesTask(this, 'DadJokePrompt', {
            appendToLatestMessage: "---\n\nStep 1) Look up a random dad joke using the provided random_dad_joke tool. Do not use the search_dad_jokes tool. Do not invent or remember a joke, you must look it up\n"+
                "Step 2) Modify the provided email to include the joke. Return the email in full. Keep as much of the email the same as possible, only modify it to add your joke."
        }))
        chain.pushLink(capableModelWithDadJokeMcp);
        chain.pushLink(new LLMGate(this, 'ConfirmDadJoke', {
            capableModel: capableModelForConfirmingDadJoke,
            prompt: "Please analyze how funny the joke is and provide a score from 1-10 where 1 is very negative and 10 is very positive. Return only a JSON object with a 'score' field.",
            condition: {
                type: "pass_if_in_range",
                gte: 7,      // Pass if score >= 7
                lte: 10,     // Pass if score <= 10
                min: 1,      // Minimum valid score
                max: 10      // Maximum valid score
            }
        }))
        chain.pushLink(new EditMessagesTask(this, 'SpanishTranslation', {
            messagesPush: [
                {
                    role: "user",
                    content: "Translate the full email into Spanish."
                }
            ]
        }))
        chain.pushLink(capableModelWithoutMcps);

        const _workflow = new Workflow(this, 'Workflow', {
            definition: chain
        });
    }
}
