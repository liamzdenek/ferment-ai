
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