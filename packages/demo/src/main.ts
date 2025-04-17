import { AgentContext, OpenAIModel, VirtualModel } from '@ferment-ai/core-constructs-lib';
import { Construct, RootConstruct } from 'constructs';
import { createCoreConstructsModule } from '@ferment-ai/core-constructs-runtime';
import { Journal } from '@ferment-ai/runtime-in-memory';
import { Workflow, WorkflowEndTask } from '@ferment-ai/runtime-common';

class TwoAgentModel extends VirtualModel {
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
        seniorEngineerTask.canCallAndReturn(juniorEngineerTask.sendEmailTool());
        seniorEngineerTask.canCall(endTask);

        // Create the workflow
        const workflow = new Workflow(this, 'TwoAgentWorkflow', {
            definition: seniorEngineerTask
        });
    }
}

// Create a root construct
const rootConstruct = new RootConstruct('Root');

// Create the virtual model
new TwoAgentModel(rootConstruct, 'TwoAgentModel');

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
        
        for await (const event of journal.executeWorkflow(workflowName, { message: 'Hello, world!' })) {
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