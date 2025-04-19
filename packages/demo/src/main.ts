import { Construct, RootConstruct } from 'constructs';
import { createCoreConstructsModule } from '@ferment-ai/core-constructs-runtime';
import { Journal } from '@ferment-ai/runtime-in-memory';
import { TestMCPGetCapabilities } from './tests/TestMCPGetCapabilities.js';
import { TestConstruct } from './TestConstruct.js';
import { SimpleCall } from './tests/SimpleCall.js';
import { TestMCPExecuteCapability } from './tests/TestMCPExecuteCapability.js';
import { TestCapableModel } from './tests/TestCapableModel.js';

// Create a root construct
const rootConstruct = new RootConstruct('Root');

/**
 * All this LOOKUP logic is just because we're combining multiple demos into one application
 * and using the CLI to switch between constructs.
 * 
 * In practice, you'd just do "new MyConstructName(rootConstruct, 'MyConstructName', args);"
 * and call it a day
 */
const LOOKUP: { [cliArg: string]: new (parent: Construct, id: string) => TestConstruct } = {
    // if you're trying to learn how the constructs work, this order is roughly
    // most simple first => most complex => special cases end
    "SimpleCall": SimpleCall,
    "TestMCPGetCapabilities": TestMCPGetCapabilities,
    "TestMCPExecuteCapability": TestMCPExecuteCapability,

    "TestCapableModel": TestCapableModel,
}

const cliArg = process.argv[2];
const ActualClass = LOOKUP[cliArg];

if(!ActualClass) {
    throw new Error("Unknown demo name: "+cliArg);
}

// Create the virtual model
const i = new ActualClass(rootConstruct, cliArg);

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
        
        for await (const event of journal.executeWorkflow(workflowName, i.testPrompt)) {
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