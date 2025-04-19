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