import { AgentContext, Entrypoint, OpenAIModel, VirtualModel } from '@ferment/core-constructs-lib';
import { Construct, RootConstruct } from 'constructs';

class TwoAgentModel extends VirtualModel {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        //const editor = new VsCodeEditor(this, 'Editor', {}); // should integrate with the language server so when a file is modified, it pulls the errors from that file before returning the results

        const juniorEngineerModel = new OpenAIModel(this, 'JuniorEngineerModel', { model: "o1-mini-2024-09-12" })

        const juniorEngineer = new AgentContext(this, 'JuniorEngineerAgent', {
            model: juniorEngineerModel,
            prompt: "You are a junior engineer, you are ruthlessly working to solve a problem but if you get stuck, you ask the senior engineer for help. You finish by informing the senior engineer of your results."
        })

        /*
        juniorEngineer.addTool(editor.saveFileTool())
        juniorEngineer.addTool(editor.grepTool());
        juniorEngineer.addTool(editor.runCommandTool());
        */

        const seniorEngineerModel = new OpenAIModel(this, 'SeniorEngineerModel', { model: "o1-mini-2024-09-12" })

        const seniorEngineer = new AgentContext(this, 'SeniorEngineerAgent', {
            model: seniorEngineerModel,
            prompt: "You are a senior engineer. You received a problem from your Senior Manager, and you are responsible for delegating reasonable units of work to the junior engineer. You help keep the junior engineer on task by answering their questions, and you finish by summarizing the results."
        })


        juniorEngineer.addTool(seniorEngineer.sendEmailTool());
        seniorEngineer.addTool(juniorEngineer.sendEmailTool());

        this.entrypoint = new Entrypoint(this, 'Entrypoint', {
            promptAgent: seniorEngineer
        });

        //seniorEngineer.addTool(this.exitPoint!.finishWorkingTool());
    }
}
const app = new RootConstruct();
new TwoAgentModel(app, 'TwoAgentModel');

console.log('node', app.node);

console.log('children', app.node.findAll());

