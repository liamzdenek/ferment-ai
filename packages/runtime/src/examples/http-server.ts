import { HttpApplication } from '../lib/http-application.js';
import { RootConstruct } from 'constructs';
import { VirtualModel, AgentContext, OpenAIModel, Entrypoint } from '@ferment-ai/core-constructs-lib';

/**
 * Example of how to use the HttpApplication class
 */
async function main() {
  // Create a root construct
  const app = new RootConstruct('app');
  
  // Create a virtual model
  const twoAgentModel = new TwoAgentModel(app, 'TwoAgentModel');
  
  // Create an HTTP application
  const httpApp = new HttpApplication('http-app', {
    plugins: [
      {
        apply(expressApp) {
          // Add a custom route
          expressApp.get('/hello', (req, res) => {
            res.json({ message: 'Hello, world!' });
          });
        }
      }
    ]
  });
  
  // Start the server
  await httpApp.serve({
    port: 3000,
    host: 'localhost'
  });
  
  console.log('Server started at http://localhost:3000');
}

/**
 * Example virtual model with two agents
 */
class TwoAgentModel extends VirtualModel {
  constructor(scope: RootConstruct, id: string) {
    super(scope, id);
    
    // Create models
    const juniorEngineerModel = new OpenAIModel(this, 'JuniorEngineerModel', { 
      model: "o1-mini-2024-09-12" 
    });
    
    const seniorEngineerModel = new OpenAIModel(this, 'SeniorEngineerModel', { 
      model: "o1-mini-2024-09-12" 
    });
    
    // Create agents
    const juniorEngineer = new AgentContext(this, 'JuniorEngineerAgent', {
      model: juniorEngineerModel,
      prompt: "You are a junior engineer, you are ruthlessly working to solve a problem but if you get stuck, you ask the senior engineer for help. You finish by informing the senior engineer of your results."
    });
    
    const seniorEngineer = new AgentContext(this, 'SeniorEngineerAgent', {
      model: seniorEngineerModel,
      prompt: "You are a senior engineer. You received a problem from your Senior Manager, and you are responsible for delegating reasonable units of work to the junior engineer. You help keep the junior engineer on task by answering their questions, and you finish by summarizing the results."
    });
    
    // Connect agents
    juniorEngineer.addTool(seniorEngineer.sendEmailTool());
    seniorEngineer.addTool(juniorEngineer.sendEmailTool());
    
    // Set entrypoint
    this.entrypoint = new Entrypoint(this, 'Entrypoint', {
      promptAgent: seniorEngineer
    });
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}