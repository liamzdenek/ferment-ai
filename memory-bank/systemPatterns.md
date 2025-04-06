# System Patterns: Ferment AI

## Architectural Patterns

### 1. Construct-Based Architecture

Ferment AI uses the AWS CDK constructs library to create a hierarchical, composable architecture:

```mermaid
graph TD
    Construct[Base Construct] --> FermentConstruct[Ferment Construct]
    FermentConstruct --> VirtualModel[Virtual Model]
    FermentConstruct --> AgentContext[Agent Context]
    FermentConstruct --> Tool[Tool]
    FermentConstruct --> Model[Model]
    FermentConstruct --> Entrypoint[Entrypoint]
    FermentConstruct --> ExitPoint[Exit Point]
    Model --> OpenAIModel[OpenAI Model]
    Model --> AnthropicModel[Anthropic Model]
    Tool --> FileTool[File Tool]
    Tool --> CommandTool[Command Tool]
```

- **L1 Constructs**: Core primitives (FermentConstruct, VirtualModel, AgentContext, Tool, etc.)
- **L2 Constructs**: Combinations of L1 constructs for common patterns (to be implemented)
- **L3 Constructs**: High-level, domain-specific constructs (to be implemented)

This pattern enables:
- Clear separation between declaration and runtime
- Composition and reuse of components
- Type-safe configuration
- Hierarchical organization of complex systems

### 2. Journal-Centric Architecture

The journal is the central source of truth for the entire system:

```mermaid
graph TD
    Tools[Tools] -->|Publish events| Journal[Central Journal]
    Agents[Agents] -->|Publish events| Journal
    Journal -->|Subscribe to events| AgentContexts[Agent Contexts]
    Journal -->|Serialize| ClientState[Client State]
    ClientState -->|Deserialize| Journal
```

This pattern enables:
- Stateless server operation
- Complete state reconstruction
- Pause/resume capabilities
- Clear audit trail of all operations

### 3. Pub-Sub Messaging

Components communicate through a pub-sub pattern:

```mermaid
graph TD
    Publisher[Publisher] -->|Publish event| Journal[Journal]
    Journal -->|Notify| Subscriber1[Subscriber 1]
    Journal -->|Notify| Subscriber2[Subscriber 2]
    Journal -->|Notify| SubscriberN[Subscriber N]
```

This pattern enables:
- Loose coupling between components
- Asynchronous operation
- Scalability
- Extensibility

## Implementation Patterns

### 1. Base Construct Pattern

The `FermentConstruct` class serves as the base for all Ferment constructs:

```typescript
export abstract class FermentConstruct extends Construct {
  public readonly description?: string;

  constructor(scope: Construct, id: string, props: FermentConstructProps = {}) {
    super(scope, id);
    this.description = props.description;
  }

  public override toString(): string {
    return `${this.node.id}${this.description ? ` (${this.description})` : ''}`;
  }
}
```

This pattern provides:
- Common properties and methods for all constructs
- Consistent initialization
- Clear identification of constructs

### 2. Virtual Model Pattern

The `VirtualModel` class represents a complete agent system:

```typescript
export class VirtualModel extends FermentConstruct {
  public readonly name: string;
  private _entrypoint?: Construct;
  private _exitPoint?: Construct;

  constructor(scope: Construct, id: string, props: VirtualModelProps = {}) {
    super(scope, id, props);
    this.name = props.name ?? id;
  }

  public set entrypoint(entrypoint: Construct) {
    this._entrypoint = entrypoint;
  }

  public get entrypoint(): Construct | undefined {
    return this._entrypoint;
  }

  public set exitPoint(exitPoint: Construct) {
    this._exitPoint = exitPoint;
  }

  public get exitPoint(): Construct | undefined {
    return this._exitPoint;
  }

  public validate(): void {
    if (!this._entrypoint) {
      throw new Error(`Virtual model ${this.name} must have an entrypoint`);
    }
  }
}
```

This pattern provides:
- A container for agent contexts
- Entry and exit points for the system
- Validation of the system configuration

### 3. Agent Context Pattern

The `AgentContext` class represents an environment for a single agent:

```typescript
export class AgentContext extends FermentConstruct {
  public readonly prompt: string;
  public readonly model: Construct;
  private readonly _tools: Construct[] = [];

  constructor(scope: Construct, id: string, props: AgentContextProps) {
    super(scope, id, props);
    this.prompt = props.prompt;
    this.model = props.model;

    if (props.tools) {
      for (const tool of props.tools) {
        this.addTool(tool);
      }
    }
  }

  public addTool(tool: Construct): AgentContext {
    this._tools.push(tool);
    return this;
  }

  public get tools(): Construct[] {
    return [...this._tools];
  }

  public sendEmailTool(): Construct {
    return new Construct(this, `${this.node.id}SendEmailTool`);
  }
}
```

This pattern provides:
- A container for agent-specific configuration
- Management of tools available to the agent
- Creation of communication tools

### 4. Model Pattern

The `Model` class represents an LLM provider:

```typescript
export abstract class Model extends FermentConstruct {
  public readonly modelId: string;
  protected readonly apiKey?: string;
  protected readonly baseUrl?: string;
  protected readonly parameters: Record<string, any>;

  constructor(scope: Construct, id: string, props: ModelProps) {
    super(scope, id, props);
    this.modelId = props.model;
    this.apiKey = props.apiKey;
    this.baseUrl = props.baseUrl;
    this.parameters = props.parameters ?? {};
  }
}
```

This pattern provides:
- Common configuration for LLM providers
- Specific implementations for different providers (OpenAI, Anthropic)
- Consistent interface for agent contexts

### 5. Tool Pattern

The `Tool` class represents a capability that can be used by an agent:

```typescript
export abstract class Tool<
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType
> extends FermentConstruct {
  public override readonly description: string;
  public readonly name: string;
  public abstract readonly inputSchema: TInputSchema;
  public abstract readonly outputSchema: TOutputSchema;

  constructor(scope: Construct, id: string, props: ToolProps) {
    super(scope, id, props);
    this.name = props.name;
    this.description = props.description;
  }

  public toJsonSchema(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      input_schema: zodToJsonSchema(this.inputSchema),
      output_schema: zodToJsonSchema(this.outputSchema),
    };
  }
}
```

This pattern provides:
- Schema validation for tool inputs and outputs
- Conversion to JSON Schema for documentation
- Specific implementations for different tool types (File, Command)

## Key Technical Decisions

1. **Using AWS CDK Constructs**: We're using the actual "constructs" npm package from AWS CDK as the foundation for our configuration system.

2. **Journal as Source of Truth**: The journal is the central source of truth for the entire system, containing all data needed to reconstruct agent contexts and continue execution.

3. **Stateless API Design**: The system has no persistence and relies on a stateless API, where the end user stores the entire journal and passes it to the API to resume a paused/canceled prompt.

4. **Package Structure**: We've organized the codebase into multiple packages to maintain separation of concerns and enable modular development.

5. **Tool Implementation with Zod**: We're using Zod for schema validation in our tools, which provides runtime type safety and clear error messages.

6. **TypeScript Configuration**: We've configured TypeScript to use the appropriate module resolution strategy and other compiler options.

7. **Testing with Jest**: We're using Jest for testing, although we're currently experiencing issues with the Jest plugin in the Nx configuration.