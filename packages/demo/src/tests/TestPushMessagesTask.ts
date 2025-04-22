import { CAPABLE_WORKFLOW_TASK_DEF, EditMessagesTask } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestPushMessagesTask extends TestConstruct {
    public override testPrompt: z.infer<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType> = {
        messages: [
            {
                role: "system",
                content: "Initial Message"
            }
        ]
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const task = new EditMessagesTask(this, 'PushMessagesTask', {
            messagesPush: [
                {
                    role: "system",
                    content: "Push Me"
                }
            ],
            messagesUnshift: [
                {
                    role: "system",
                    content: "Unshift Me"
                }
            ]
        })

        const _workflow = new Workflow(this, 'Workflow', {
            definition: task
        });
    }
}
