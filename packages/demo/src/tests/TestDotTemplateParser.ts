import { RENDER_TEMPLATE_TASK_DEF, DotTemplateParser } from '@ferment-ai/core-constructs-lib';
import { Workflow } from '@ferment-ai/runtime-common';
import { Construct } from 'constructs';
import { TestConstruct } from '../TestConstruct.js';
import { z } from 'zod';

export class TestDotTemplateParser extends TestConstruct {
    public override testPrompt: z.infer<typeof RENDER_TEMPLATE_TASK_DEF.inputType> = {
        data: {
            items: ['apple', 'banana', 'cherry'],
            user: {
                name: 'Test User',
                role: 'Developer'
            }
        }
    };

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create a DotTemplateParser with a template that uses the data
        const templateParser = new DotTemplateParser(this, 'DotTemplateParser', {
            template: `
# Hello {{=it.user.name}}!

You are a {{=it.user.role}}.

Here are some fruits:
{{~it.items :item}}
- {{=item}}
{{~}}
            `.trim()
        });

        // Create a workflow that uses the template parser
        const workflow = new Workflow(this, 'Workflow', {
            definition: templateParser
        });
    }
}