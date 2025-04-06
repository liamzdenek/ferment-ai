# Core Constructs Implementation

## Overview

This document outlines the implementation of the core constructs in the core-constructs-lib and their corresponding implementations in the core-constructs-runtime. The goal is to build out the core constructs (agents, models, tools, etc.) and ensure they work properly with the journal system.

## Core Constructs in core-constructs-lib

The core-constructs-lib package already has the basic structure for the core constructs, but some implementations need to be enhanced to support the full functionality required by the system.

### 1. AgentContext

The AgentContext class represents an environment for a single agent. It contains the agent's prompt, model, and tools. The current implementation needs to be enhanced to support:

- Better tool management
- Context management
- Message handling
- Execution control

```typescript
export class AgentContext extends FermentConstruct {
  /**
   * The prompt template for the agent
   */
  public readonly prompt: string;

  /**
   * The model to use for the agent
   */
  public readonly model: Construct;

  /**
   * The tools available to the agent
   */
  private readonly _tools: Construct[] = [];

  /**
   * The context window size for the agent
   */
  private readonly _contextWindowSize: number;

  /**
   * Creates a new instance of the AgentContext class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: AgentContextProps) {
    super(scope, id, props);
    this.prompt = props.prompt;
    this.model = props.model;
    this._contextWindowSize = props.contextWindowSize ?? 4000;

    // Add tools if provided
    if (props.tools) {
      for (const tool of props.tools) {
        this.addTool(tool);
      }
    }
  }

  /**
   * Adds a tool to the agent context
   * 
   * @param tool The tool to add
   * @returns The agent context
   */
  public addTool(tool: Construct): AgentContext {
    this._tools.push(tool);
    return this;
  }

  /**
   * Gets the tools available to the agent
   */
  public get tools(): Construct[] {
    return [...this._tools];
  }

  /**
   * Gets the context window size for the agent
   */
  public get contextWindowSize(): number {
    return this._contextWindowSize;
  }

  /**
   * Creates a tool that sends a message to this agent
   * 
   * @returns A tool that can be used to send messages to this agent
   */
  public sendEmailTool(): Construct {
    return new SendEmailTool(this, `${this.node.id}SendEmailTool`, {
      name: `Send Email to ${this.node.id}`,
      description: `Send a message to the ${this.node.id} agent`,
      targetAgent: this,
    });
  }
}
```

### 2. SendEmailTool

The SendEmailTool class is a new tool that allows agents to communicate with each other. It should be implemented as follows:

```typescript
/**
 * Properties for the SendEmailTool construct
 */
export interface SendEmailToolProps extends ToolProps {
  /**
   * The target agent to send messages to
   */
  readonly targetAgent: AgentContext;
}

/**
 * A SendEmailTool represents a tool for sending messages to an agent
 */
export class SendEmailTool extends Tool<
  z.ZodObject<{
    message: z.ZodString;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
    messageId: z.ZodString;
  }>
> {
  /**
   * The target agent to send messages to
   */
  private readonly targetAgent: AgentContext;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    message: z.string().describe('The message to send to the agent'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the message was sent successfully'),
    messageId: z.string().describe('The ID of the sent message'),
  });

  /**
   * Creates a new instance of the SendEmailTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: SendEmailToolProps) {
    super(scope, id, props);
    this.targetAgent = props.targetAgent;
  }

  /**
   * Gets the target agent
   */
  public getTargetAgent(): AgentContext {
    return this.targetAgent;
  }
}
```

### 3. ExitPointTool

The ExitPointTool class is a new tool that allows agents to finish the virtual model execution. It should be implemented as follows:

```typescript
/**
 * Properties for the ExitPointTool construct
 */
export interface ExitPointToolProps extends ToolProps {
  /**
   * The exit point to use
   */
  readonly exitPoint: ExitPoint;
}

/**
 * An ExitPointTool represents a tool for finishing the virtual model execution
 */
export class ExitPointTool extends Tool<
  z.ZodObject<{
    result: z.ZodString;
  }>,
  z.ZodObject<{
    success: z.ZodBoolean;
  }>
> {
  /**
   * The exit point to use
   */
  private readonly exitPoint: ExitPoint;

  /**
   * The input schema for the tool
   */
  public readonly inputSchema = z.object({
    result: z.string().describe('The result of the virtual model execution'),
  });

  /**
   * The output schema for the tool
   */
  public readonly outputSchema = z.object({
    success: z.boolean().describe('Whether the virtual model execution was finished successfully'),
  });

  /**
   * Creates a new instance of the ExitPointTool class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ExitPointToolProps) {
    super(scope, id, props);
    this.exitPoint = props.exitPoint;
  }

  /**
   * Gets the exit point
   */
  public getExitPoint(): ExitPoint {
    return this.exitPoint;
  }
}
```

### 4. ExitPoint

The ExitPoint class should be updated to use the ExitPointTool:

```typescript
export class ExitPoint extends FermentConstruct {
  /**
   * The message to display when the virtual model exits
   */
  private readonly exitMessage?: string;

  /**
   * Creates a new instance of the ExitPoint class
   * 
   * @param scope The parent construct
   * @param id The construct's identifier
   * @param props The construct properties
   */
  constructor(scope: Construct, id: string, props: ExitPointProps = {}) {
    super(scope, id, props);
    this.exitMessage = props.exitMessage;
  }

  /**
   * Creates a tool that finishes the virtual model execution
   * 
   * @returns A tool that can be used to finish the virtual model execution
   */
  public finishWorkingTool(): Construct {
    return new ExitPointTool(this, `${this.node.id}FinishWorkingTool`, {
      name: 'Finish Working',
      description: 'Finish the virtual model execution and return the result',
      exitPoint: this,
    });
  }

  /**
   * Gets the exit message
   */
  public getExitMessage(): string | undefined {
    return this.exitMessage;
  }
}
```

## Core Constructs Runtime Implementation

The core-constructs-runtime package needs to implement the runtime behavior for the core constructs. This includes binding the constructs to the journal and implementing the actual execution logic.

### 1. AgentContextBinding

The AgentContextBinding class needs to be enhanced to support the full functionality of the AgentContext:

```typescript
export class AgentContextBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'agent-context-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'AgentContext';

  /**
   * Creates a new AgentContextBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  public canBind(node: Node): boolean {
    return node.constructor.name === 'AgentContext';
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected async doBind(node: Node): Promise<BindingResult> {
    try {
      const agentContext = node.host as any;
      
      // Extract agent context information
      const agentInfo = {
        id: node.id,
        type: node.constructor.name,
        prompt: agentContext.prompt,
        modelId: agentContext.model.node.id,
        tools: agentContext.tools.map((tool: any) => tool.node.id),
        contextWindowSize: agentContext.contextWindowSize,
      };
      
      // Publish agent context information to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'agent_context_registered',
        agentContext: agentInfo,
      });

      // Subscribe to messages for this agent
      const subscriptionId = this.journal.subscribe(
        (event) => {
          if (event.type === EventType.AGENT && event.target === node.id) {
            this.handleAgentMessage(node, event);
          }
        },
        {
          type: EventType.AGENT,
          target: node.id,
        }
      );

      // Store the subscription ID for cleanup
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'agent_subscription_created',
        agentId: node.id,
        subscriptionId,
      });
      
      return this.createSuccessResult(node);
    } catch (error: any) {
      return this.createFailureResult(node, `Failed to bind agent context: ${error.message}`);
    }
  }

  /**
   * Handles a message for an agent
   * 
   * @param node The agent node
   * @param event The journal event
   */
  private async handleAgentMessage(node: Node, event: JournalEvent): Promise<void> {
    try {
      const agentContext = node.host as any;
      const model = agentContext.model;
      
      // Get the model binding
      const modelBinding = this.getModelBinding(model.node.id);
      if (!modelBinding) {
        throw new Error(`Model binding not found for model ${model.node.id}`);
      }
      
      // Get the agent's context
      const context = this.getAgentContext(node.id);
      
      // Add the message to the context
      context.messages.push({
        role: event.source === node.id ? 'assistant' : 'user',
        content: event.payload.message,
      });
      
      // If the message is from the user, generate a response
      if (event.source !== node.id) {
        // Generate a response using the model
        const response = await modelBinding.generateResponse(model.node, context);
        
        // Publish the response to the journal
        this.journal.publish(EventType.AGENT, node.id, {
          action: 'agent_response',
          message: response,
        }, event.source);
      }
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'agent_message_error',
        agentId: node.id,
        error: error.message,
      });
    }
  }

  /**
   * Gets the model binding for a model
   * 
   * @param modelId The model ID
   * @returns The model binding, or undefined if not found
   */
  private getModelBinding(modelId: string): any {
    // This would be implemented to get the model binding from the journal
    return undefined;
  }

  /**
   * Gets the agent's context
   * 
   * @param agentId The agent ID
   * @returns The agent's context
   */
  private getAgentContext(agentId: string): any {
    // This would be implemented to get the agent's context from the journal
    return {
      messages: [],
    };
  }
}
```

### 2. SendEmailToolBinding

The SendEmailToolBinding class needs to be implemented to support the SendEmailTool:

```typescript
export class SendEmailToolBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'send-email-tool-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'SendEmailTool';

  /**
   * Creates a new SendEmailToolBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  public canBind(node: Node): boolean {
    return node.constructor.name === 'SendEmailTool';
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected async doBind(node: Node): Promise<BindingResult> {
    try {
      const tool = node.host as any;
      
      // Extract tool information
      const toolInfo = {
        id: node.id,
        type: node.constructor.name,
        name: tool.name,
        description: tool.description,
        targetAgentId: tool.getTargetAgent().node.id,
        inputSchema: JSON.stringify(tool.toJsonSchema().input_schema),
        outputSchema: JSON.stringify(tool.toJsonSchema().output_schema),
      };
      
      // Publish tool information to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_registered',
        tool: toolInfo,
      });

      // Subscribe to tool invocations
      const subscriptionId = this.journal.subscribe(
        (event) => {
          if (event.type === EventType.TOOL && event.target === node.id) {
            this.handleToolInvocation(node, event);
          }
        },
        {
          type: EventType.TOOL,
          target: node.id,
        }
      );

      // Store the subscription ID for cleanup
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_subscription_created',
        toolId: node.id,
        subscriptionId,
      });
      
      return this.createSuccessResult(node);
    } catch (error: any) {
      return this.createFailureResult(node, `Failed to bind send email tool: ${error.message}`);
    }
  }

  /**
   * Handles a tool invocation
   * 
   * @param node The tool node
   * @param event The journal event
   */
  private async handleToolInvocation(node: Node, event: JournalEvent): Promise<void> {
    try {
      const tool = node.host as any;
      const targetAgent = tool.getTargetAgent();
      
      // Validate the input
      const input = event.payload.input;
      const validationResult = tool.inputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new Error(`Invalid input: ${validationResult.error.message}`);
      }
      
      // Send the message to the target agent
      const messageId = `message-${Date.now()}`;
      this.journal.publish(EventType.AGENT, event.source, {
        action: 'agent_message',
        message: input.message,
        messageId,
      }, targetAgent.node.id);
      
      // Publish the result to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_result',
        result: {
          success: true,
          messageId,
        },
      }, event.source);
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_error',
        error: error.message,
      }, event.source);
    }
  }
}
```

### 3. ExitPointToolBinding

The ExitPointToolBinding class needs to be implemented to support the ExitPointTool:

```typescript
export class ExitPointToolBinding extends BaseBinding {
  /**
   * The ID of this binding class
   */
  public readonly id = 'exit-point-tool-binding';

  /**
   * The type of construct that this binding class can bind
   */
  public readonly constructType = 'ExitPointTool';

  /**
   * Creates a new ExitPointToolBinding
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    super(journal);
  }

  /**
   * Checks if this binding class can bind the given node
   * 
   * @param node The node to check
   * @returns Whether this binding class can bind the given node
   */
  public canBind(node: Node): boolean {
    return node.constructor.name === 'ExitPointTool';
  }

  /**
   * Performs the actual binding
   * 
   * @param node The node to bind
   * @returns The result of the binding
   */
  protected async doBind(node: Node): Promise<BindingResult> {
    try {
      const tool = node.host as any;
      
      // Extract tool information
      const toolInfo = {
        id: node.id,
        type: node.constructor.name,
        name: tool.name,
        description: tool.description,
        exitPointId: tool.getExitPoint().node.id,
        inputSchema: JSON.stringify(tool.toJsonSchema().input_schema),
        outputSchema: JSON.stringify(tool.toJsonSchema().output_schema),
      };
      
      // Publish tool information to the journal
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_registered',
        tool: toolInfo,
      });

      // Subscribe to tool invocations
      const subscriptionId = this.journal.subscribe(
        (event) => {
          if (event.type === EventType.TOOL && event.target === node.id) {
            this.handleToolInvocation(node, event);
          }
        },
        {
          type: EventType.TOOL,
          target: node.id,
        }
      );

      // Store the subscription ID for cleanup
      this.journal.publish(EventType.SYSTEM, this.id, {
        action: 'tool_subscription_created',
        toolId: node.id,
        subscriptionId,
      });
      
      return this.createSuccessResult(node);
    } catch (error: any) {
      return this.createFailureResult(node, `Failed to bind exit point tool: ${error.message}`);
    }
  }

  /**
   * Handles a tool invocation
   * 
   * @param node The tool node
   * @param event The journal event
   */
  private async handleToolInvocation(node: Node, event: JournalEvent): Promise<void> {
    try {
      const tool = node.host as any;
      const exitPoint = tool.getExitPoint();
      
      // Validate the input
      const input = event.payload.input;
      const validationResult = tool.inputSchema.safeParse(input);
      if (!validationResult.success) {
        throw new Error(`Invalid input: ${validationResult.error.message}`);
      }
      
      // Publish the exit event to the journal
      this.journal.publish(EventType.SYSTEM, node.id, {
        action: 'virtual_model_exit',
        result: input.result,
        exitMessage: exitPoint.getExitMessage(),
      });
      
      // Publish the result to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_result',
        result: {
          success: true,
        },
      }, event.source);
    } catch (error: any) {
      // Publish an error event to the journal
      this.journal.publish(EventType.TOOL, node.id, {
        action: 'tool_error',
        error: error.message,
      }, event.source);
    }
  }
}
```

### 4. Updated Binding Class Factory

The DefaultBindingClassFactory class needs to be updated to include the new binding classes:

```typescript
export class DefaultBindingClassFactory implements BindingClassFactory {
  /**
   * The binding classes
   */
  private readonly bindingClasses: BindingClass[];

  /**
   * Creates a new DefaultBindingClassFactory
   * 
   * @param journal The journal to use
   */
  constructor(private readonly journal: Journal) {
    this.bindingClasses = [
      new ModelBinding(journal),
      new AgentContextBinding(journal),
      new ToolBinding(journal),
      new SendEmailToolBinding(journal),
      new ExitPointToolBinding(journal),
    ];
  }

  /**
   * Creates a binding class for the given construct type
   * 
   * @param constructType The type of construct to create a binding class for
   * @returns The binding class, or undefined if no binding class is available for the given construct type
   */
  public createBindingClass(constructType: string): BindingClass | undefined {
    return this.bindingClasses.find(bindingClass => bindingClass.constructType === constructType);
  }

  /**
   * Gets all available binding classes
   * 
   * @returns All available binding classes
   */
  public getAllBindingClasses(): BindingClass[] {
    return [...this.bindingClasses];
  }
}
```

## Conclusion

By implementing these changes, we will have a complete implementation of the core constructs in the core-constructs-lib and their corresponding implementations in the core-constructs-runtime. This will provide a solid foundation for building multi-agent systems with the Ferment AI framework.