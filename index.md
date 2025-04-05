# Ferment AI

THe purpose of this project is to create a configuration language where agents, tools, conversations, mcps, etc can be configured in a single static CDK-like configuration file, and then ran.

We must support real time streaming of tokens to the end user so they can see it running, but not between the agents -- they get to wait until the other agent has finished entirely.

We need to be able to surface status information about which agent is running what, with the ability to see each context separately.

Use CDK Constructs library

```ts

class TwoAgentModel extends Ferment.VirtualModel {
    constructor(scope: Construct, id: string) {
        super();

        const editor = new VsCodeEditor(this, 'Editor', {}); // should integrate with the language server so when a file is modified, it pulls the errors from that file before returning the results

        const juniorEngineerModel = new OpenAIModel(this, 'JuniorEngineerModel', { model: "o1-mini-2024-09-12" })

        const juniorEngineer = new AgentContext(this, 'JuniorEngineerAgent', {
            model: juniorEngineerModel,
            prompt: "You are a junior engineer, you are ruthlessly working to solve a problem but if you get stuck, you ask the senior engineer for help. You finish by informing the senior engineer of your results."
        })

        juniorEngineer.addTool(editor.saveFileTool())
        juniorEngineer.addTool(editor.grepTool());
        juniorEngineer.addTool(editor.runCommandTool());

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

        seniorEngineer.addTool(this.exitPoint.finishWorkingTool());
    }
}

const api = new Ferment.Api();
new TwoAgentModel(api, 'TwoAgentModel');

api.serveApi(8082); // openai compatible api, sending requests with the model name "TwoAgentModel" should trigger the entrypoint of the virtual model.
```

# Ferment.VirtualModel Behaviors

Each context can be running in parallel. As long as at least one context is running, the prompt is still going.

The prompt starts by being passed thru the entrypoint to a specific context.

Emails are asynchronous -- we do not cancel currently running prompts for an email. But, we add it to the thread and reinvoke when the running prompt is done.

Emaisl are a specific implementation of a generic "Message" system where messages can be sent between agents. 

We need to have a special message type of HIDDEN_CONTEXTS added to the message responses from the openai compatible api. this should contain the data needed for this API to operate statelessly and properly re-hydrate the existing Contexts between messages.

The classes shown here are to *declare* the system. These classes should *not* contain runtime logic. To the extent a parallel class needs to exist, we should append "I" to the class name to indicate that it is the runtime instance version, not the declarative version.

The editor will provide file access tools tht capture errors from the language server before returning results.

We should keep a central journal of processes -- tools, agent invocations, etc are all processes. This journal should be the authoritative source of data for EVERYTHING. Agent Context instances should *derive* their context from this journal.

The journal should operate on a pub-sub model.

Tools should publish their results to the central message journal, which should be picked up by the context of the corresponding agent in order to trigger the prompting

Versioning will be handled by having two different VirtualModels with different names

Tool errors should be surfaced to the agent invoked the tool. However, the failure should be clearly visible in the log should a human wish to cancel and intervene.

A human can cancel the processes at any point and it should cancel all running requests, return the current state of the journal.

To resume, a human just needs to pass the current state of the journal that they would like to resume from (aka the return result of cancelling, without any modifications), plus they can provide any new messages they would like to add to any agent context.

We should be able to see the real time stream of updates to the journal in our http streaming response. The client will need to construct this stream into the full journal in order to render the UX for it.

### Tool style that I like:

```ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClaudeContext } from '../claude-context';

/**
 * Tool definition format for Claude API
 */
export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

/**
 * Interface for all tools that Claude can use
 */
export interface Tool<
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType
> {
  // Tool metadata
  name: string;
  description: string;
  
  // Schemas for input and output
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  
  // Method to execute the tool with context
  execute(input: z.infer<TInputSchema>, context: ClaudeContext): Promise<z.infer<TOutputSchema>>;
  
  // Convert to Claude API format
  toClaudeToolDefinition(): ClaudeToolDefinition;
}

/**
 * Base class for implementing tools
 */
export abstract class BaseTool<
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType
> implements Tool<TInputSchema, TOutputSchema> {
  
  constructor(
    public name: string,
    public description: string,
    public inputSchema: TInputSchema,
    public outputSchema: TOutputSchema
  ) {}
  
  abstract execute(input: z.infer<TInputSchema>, context: ClaudeContext): Promise<z.infer<TOutputSchema>>;
  
  toClaudeToolDefinition(): ClaudeToolDefinition {
    // @ts-ignore - Suppress the "Type instantiation is excessively deep and possibly infinite" error
    return {
      name: this.name,
      description: this.description,
      input_schema: zodToJsonSchema(this.inputSchema)
    };
  }
}
```