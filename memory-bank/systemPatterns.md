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

### 2. Entity-Component-System (ECS) Architecture

The journal now implements an event-oriented variant of the Entity-Component-System pattern:

```mermaid
graph TD
    Journal[Journal/"World"] --> Entities[Entities]
    Journal --> Components[Components]
    Journal --> Systems[Systems]
    Journal --> Processes[Processes]
    Journal --> Events[Events]
    
    Systems -->|Create| Processes
    Events -->|Trigger| Systems
    Components -->|Attach to| Entities
```

This pattern enables:
- Clear separation of data (components) from behavior (systems)
- Efficient processing of only active entities
- Event-driven architecture that avoids polling
- Flexible composition of entity capabilities
- Stateless server operation with complete state reconstruction
- Pause/resume capabilities with full serialization
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

## Package Structure and Responsibilities

The Ferment AI system is organized into several packages, each with a specific responsibility:

### 1. Core Constructs Library (`@ferment-ai/core-constructs-lib`)

This package defines the constructs using the AWS CDK Constructs library. It defines the relationship between agents and what they have access to, but does NOT define how to actually run the agent.

Key components:
- `FermentConstruct`: Base class for all Ferment constructs
- `VirtualModel`: Top-level container for agent systems
- `AgentContext`: Environment for a single agent
- `Model`: Interface for LLM providers
- `Tool`: Interface for tools that can be used by agents
- `Entrypoint` and `ExitPoint`: Starting and ending points for a virtual model

### 2. Runtime Common (`@ferment-ai/runtime-common`)

This package defines interfaces and utilities that both core-constructs-runtime and runtime will implement. It serves as a contract between the definition and runtime layers.

Key components:
- `RuntimeModule`: Interface for runtime modules with a single initialize function
- `Journal`: Interface for the journal system
- `BindingClass`: Interface for classes that bind constructs to the journal
- `createStandardRuntimeModule`: Helper function to create a standard runtime module

### 3. Core Constructs Runtime (`@ferment-ai/core-constructs-runtime`)

This package defines how to run the constructs at runtime by binding to the Journal. It has a 1-to-1 relationship with core-constructs-lib. For example, if an agent is defined in core-constructs-lib, core-constructs-runtime figures out how to send the request to make that agent work.

Key components:
- `createCoreConstructsRuntimeModule`: Function that creates a runtime module for core constructs
- Binding classes for each construct type (Model, AgentContext, Tool)
- `DefaultBindingClassFactory`: Factory for creating binding classes

### 4. Journal (`@ferment-ai/journal`)

This package defines the journal as the central "World" in the ECS architecture, providing functionality to manage entities, components, systems, and processes. It implements the event-driven architecture and provides serialization/deserialization of the full state.

Key components:
- `Journal`: Central source of truth for the system
- `EventType`: Types of events that can be published to the journal
- `EventFilter`: Filtering mechanism for journal events

### 5. Runtime (`@ferment-ai/runtime`)

This package contains logic related to running the application as a whole. It sets up the journal, strings everything together, and allows the user to define what they want out of the agents (e.g., HTTP API, chatbot, etc.).

Key components:
- `HttpApplication`: HTTP API for the system
- Concrete implementations of runtime modules

### 5. Specialized Packages

These packages contain specific implementations for different providers or functionalities:
- `@ferment-ai/models`: Implementations of the Model interface for different LLM providers
- `@ferment-ai/tools`: Implementations of the Tool interface for different tool types
- `@ferment-ai/api`: API layer for the system
- `@ferment-ai/testing`: Testing utilities

## Key Technical Decisions

1. **Entity-Component-System Architecture**: We've implemented an event-oriented variant of the ECS pattern, where entities are just identifiers, components are pure data, and systems contain the logic.

2. **Using AWS CDK Constructs**: We're using the actual "constructs" npm package from AWS CDK as the foundation for our configuration system.

3. **Journal as ECS World**: The journal is the central "World" in the ECS architecture, containing all entities, components, systems, and processes needed to reconstruct the full state and continue execution.

4. **Module-Based Initialization**: We've implemented a module system that converts constructs to ECS elements during initialization, allowing for modular and extensible system configuration.

5. **Stateless API Design**: The system has no persistence and relies on a stateless API, where each request creates a new journal instance that runs until completion and returns the results.

6. **Process-Based Execution**: Agent calls, tool calls, etc. are represented as processes with a clear lifecycle (created, running, completed, failed), allowing for better tracking and management of long-running operations.

7. **Package Structure**: We've organized the codebase into multiple packages to maintain separation of concerns and enable modular development, with clear interfaces between the definition and runtime layers.

8. **Tool Implementation with Zod**: We're using Zod for schema validation in our tools, which provides runtime type safety and clear error messages.

9. **TypeScript Configuration**: We've configured TypeScript to use the appropriate module resolution strategy and other compiler options.

10. **Testing with Jest**: We're using Jest for testing, with comprehensive tests for the ECS architecture components.

## Implemented Patterns

### 1. Module Pattern

The `Module` interface defines how to convert constructs to ECS elements:

```typescript
export interface Module {
  /**
   * The ID of this module
   */
  readonly id: string;

  /**
   * The version of this module
   */
  readonly version: string;

  /**
   * The dependencies of this module
   */
  readonly dependencies: string[];

  /**
   * Initializes this module
   *
   * @param rootConstruct The root construct
   * @param journal The journal
   */
  initialize(rootConstruct: RootConstruct, journal: Journal): Promise<void>;
}
```

This pattern provides:
- A way to convert constructs to entities, components, and systems
- Modular initialization of the journal
- Support for third-party modules
- Clear separation of concerns

### 2. HttpApplication Pattern

The `HttpApplication` class is implemented in the runtime package with ECS support:

```typescript
export class HttpApplication extends RootConstruct {
  private modules: Module[] = [];
  private server?: http.Server;

  constructor(id: string, options: HttpApplicationOptions = {}) {
    super(id);
    
    // Initialize modules if provided
    if (options.modules) {
      this.modules = [...options.modules];
    }
  }

  /**
   * Adds a module to the application
   *
   * @param module The module to add
   */
  public addModule(module: Module): void {
    this.modules.push(module);
  }

  /**
   * Initializes the application
   *
   * @param options The initialization options
   * @returns The initialized journal
   */
  public async initialize(options: JournalOptions = {}): Promise<Journal> {
    // Add the HTTP application module
    const allModules = [...this.modules, createHttpApplicationModule()];
    
    // Initialize the journal with all modules
    return await initializeJournal(this, allModules, options);
  }

  /**
   * Serves the application over HTTP
   *
   * @param options The serve options
   * @returns A promise that resolves when the server is started
   */
  public async serve(options: ServeOptions = {}): Promise<void> {
    // Initialize the journal
    const journal = await this.initialize(options.journalOptions);

    // Create the Express app
    const app = express();

    // Configure middleware
    app.use(cors());
    app.use(bodyParser.json());

    // Configure routes
    this.configureRoutes(app, journal);

    // Start the server
    const port = options.port || 3000;
    const host = options.host || 'localhost';

    return new Promise<void>((resolve, reject) => {
      this.server = app.listen(port, host, () => {
        console.log(`Server listening on http://${host}:${port}`);
        resolve();
      });
    });
  }
}
```

This pattern provides:
- A way to serve the constructs over HTTP
- Configuration for the HTTP server
- Integration with the ECS-based journal system
- Real-time streaming of events via SSE
- Stateless API design with full state serialization
- Support for multiple modules

### 3. Entity-Component Pattern

The ECS architecture uses entities and components to represent the system state:

```typescript
// Entity is just a unique identifier
export type EntityId = string;

export interface Entity {
  id: EntityId;
}

// Component is a pure data object
export interface Component {
  type: string;
  [key: string]: any;
}
```

This pattern provides:
- Clear separation of data from behavior
- Flexible composition of entity capabilities
- Type-safe component access
- Efficient component lookups

### 4. System Pattern

Systems in the ECS architecture respond to events and create processes:

```typescript
export interface System {
  id: string;
  eventTypes: string[];
  execute(journal: Journal, event: JournalEvent): Promise<void>;
}
```

This pattern provides:
- Event-driven behavior
- Clear separation of concerns
- Modular system implementation
- Efficient event handling

### 5. Process Pattern

Processes represent operations with a start and end:

```typescript
export interface Process {
  id: string;
  type: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: ProcessResult;
  [key: string]: any;
}
```

This pattern provides:
- Clear lifecycle for operations
- Status tracking for long-running operations
- Result handling for completed operations
- Error handling for failed operations