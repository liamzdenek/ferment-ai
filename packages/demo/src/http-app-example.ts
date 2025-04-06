import { Construct } from 'constructs';
import { HttpApplication } from '@ferment-ai/runtime-http';
import { AgentContext, Entrypoint, OpenAIModel, VirtualModel } from '@ferment-ai/core-constructs-lib';
import { createCoreConstructsModule } from '@ferment-ai/core-constructs-runtime';

// Create a root construct
class RootConstruct extends Construct {
  constructor() {
    super(undefined as any, 'root');
  }
}

// Create a virtual model with agents
class TwoAgentModel extends VirtualModel {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const juniorEngineerModel = new OpenAIModel(this, 'JuniorEngineerModel', { model: "o1-mini-2024-09-12" });

    const juniorEngineer = new AgentContext(this, 'JuniorEngineerAgent', {
      model: juniorEngineerModel,
      prompt: "You are a junior engineer, you are ruthlessly working to solve a problem but if you get stuck, you ask the senior engineer for help. You finish by informing the senior engineer of your results."
    });

    const seniorEngineerModel = new OpenAIModel(this, 'SeniorEngineerModel', { model: "o1-mini-2024-09-12" });

    const seniorEngineer = new AgentContext(this, 'SeniorEngineerAgent', {
      model: seniorEngineerModel,
      prompt: "You are a senior engineer. You received a problem from your Senior Manager, and you are responsible for delegating reasonable units of work to the junior engineer. You help keep the junior engineer on task by answering their questions, and you finish by summarizing the results."
    });

    juniorEngineer.addTool(seniorEngineer.sendEmailTool());
    seniorEngineer.addTool(juniorEngineer.sendEmailTool());

    this.entrypoint = new Entrypoint(this, 'Entrypoint', {
      promptAgent: seniorEngineer
    });
  }
}

async function main() {
  try {
    // Create the HTTP application/Root construct
    const httpApp = new HttpApplication('HttpApp', {
      journalOptions: {
        enableCompression: false
      }
    });

    // Add the core constructs module
    httpApp.addModule(createCoreConstructsModule());

    // Create the virtual model
    new TwoAgentModel(httpApp, 'TwoAgentModel');

    // Serve the application
    console.log('Starting HTTP server...');
    await httpApp.serve();
    console.log('HTTP server started on port 3000');
  } catch (error) {
    console.error('Error starting HTTP server:', error);
  }
}

// Run the main function
main().catch(console.error);