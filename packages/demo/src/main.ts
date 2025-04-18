import { AGENT_CONTEXT_TASK_DEF, AgentContext, GET_AVAILABLE_CAPABILITIES_TASK_DEF, InvokeChatModelTaskInputSchema, MCPCapability, MCPCapabilityGetAvailableCapabilities, OllamaModel } from '@ferment-ai/core-constructs-lib';
import { Construct, RootConstruct } from 'constructs';
import { createCoreConstructsModule } from '@ferment-ai/core-constructs-runtime';
import { Journal } from '@ferment-ai/runtime-in-memory';
import { Workflow, WorkflowEndTask } from '@ferment-ai/runtime-common';
import { z } from 'zod';

/*
class TwoAgentModel extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const juniorEngineerModel = new OpenAIModel(this, 'JuniorEngineerModel', { model: "o1-mini-2024-09-12" })

        const juniorEngineer = new AgentContext(this, 'JuniorEngineerAgent', {
            model: juniorEngineerModel,
            prompt: "You are a junior engineer, you are ruthlessly working to solve a problem but if you get stuck, you ask the senior engineer for help. You finish by informing the senior engineer of your results."
        })

        const seniorEngineerModel = new OpenAIModel(this, 'SeniorEngineerModel', { model: "o1-mini-2024-09-12" })

        const seniorEngineer = new AgentContext(this, 'SeniorEngineerAgent', {
            model: seniorEngineerModel,
            prompt: "You are a senior engineer. You received a problem from your Senior Manager, and you are responsible for delegating reasonable units of work to the junior engineer. You help keep the junior engineer on task by answering their questions, and you finish by summarizing the results."
        })

        // Create workflow tasks
        const seniorEngineerTask = seniorEngineer.newPromptTask(this, 'SeniorEngineerTask');
        const juniorEngineerTask = juniorEngineer.newPromptTask(this, 'JuniorEngineerTask');
        const endTask = new WorkflowEndTask(this, 'EndTask');

        // Set up task relationships
        seniorEngineerTask.canUseTools(juniorEngineerTask.sendEmailTool());
        seniorEngineerTask.canCall(endTask);

        // Create the workflow
        const workflow = new Workflow(this, 'TwoAgentWorkflow', {
            definition: seniorEngineerTask
        });
    }
}
*/

/*
class SimpleCall extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);
    
        const testModel = new OllamaModel(this, 'TestModel', {
            host: "ollama:11434",
            modelName: "llama3.1:8b"
        });

        const workflow = new Workflow(this, 'Workflow', {
            definition: testModel
        });
    }
}

const prompt: z.infer<typeof OllamaChatTaskInputSchema> = {
    messages: [
        { role: "user", content: "Hello world!" }
    ]
}
*/

class TestMCP extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const mcp = new MCPCapability(this, 'MCPCapability', {
            transport: {
                type: 'http',
                uri: "http://localhost:7000/mcp"
            }
        })


        const workflow = new Workflow(this, 'Workflow', {
            definition: mcp.getAvailableCapabilities
        });
    }
}


const prompt: z.infer<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType> = null;

/*
class StatefulCall extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);
    
        const testModel = new OllamaModel(this, 'TestModel', {
            host: "ollama:11434",
            modelName: "llama3.1:8b"
        });

        const agentCtx = new AgentContext(this, 'AgentContext', {
            initialMessages: [
                {
                    role: "user",
                    content: "What's the weather in Sacramento?",
                }
            ],
            model: testModel
        })

        // tool call parser
        // tool use 
        // rag
        // persistent conversation/context
        // maximum context length (according to specific tokenizer)


        const workflow = new Workflow(this, 'Workflow', {
            definition: agentCtx
        });
    }
}

const prompt: z.infer<typeof AGENT_CONTEXT_TASK_DEF.inputType> = {
    messages: [
        { role: "user", content: "Hello world!" }
    ]
}
*/

// Create a root construct
const rootConstruct = new RootConstruct('Root');

// Create the virtual model
//new TwoAgentModel(rootConstruct, 'TwoAgentModel');
//new SimpleCall(rootConstruct, 'SimpleCall')
//new StatefulCall(rootConstruct, 'StatefulCall')
new TestMCP(rootConstruct, 'TestMCP')

// Create the journal
const journal = new Journal([createCoreConstructsModule()], {
    enableCompression: false,
    rootConstruct
});


// Execute the workflow
async function runWorkflow() {
    console.log('Executing workflow...');
    
    try {
        // Get all available workflows
        const state = journal.toSavedState();
        console.log('Available workflows:', Object.keys(state.compileResult.workflows));
        
        // Get the workflow name from the TwoAgentModel
        const workflowName = Object.keys(state.compileResult.workflows)[0];
        console.log('Using workflow:', workflowName);
        
        for await (const event of journal.executeWorkflow(workflowName, prompt)) {
            console.log('Event:', event);
        }
        
        console.log('Workflow execution complete');
        /*for(const logItem of journal.toSavedState().log) {
            console.log('Journal logItem:', logItem);
        }
        console.log('Workflows:', state.compileResult.workflows);*/
    } catch (error) {
        console.error('Error executing workflow:', error);
    }
}

// Run the workflow
runWorkflow().catch((error) => {
    console.error('Error running workflow:', error);
    process.exit(1);
});