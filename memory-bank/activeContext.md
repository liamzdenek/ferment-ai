# Active Context: Ferment AI

## Current Focus

We have made significant progress in implementing the core constructs for the Ferment AI system:

1. **Implemented Core Constructs**: We have created the base constructs for the system, including:
   - `FermentConstruct`: Base class for all Ferment constructs
   - `VirtualModel`: Top-level container for agent systems
   - `AgentContext`: Environment for a single agent
   - `Model` (with `OpenAIModel` and `AnthropicModel`): LLM provider interfaces
   - `Tool` (with `FileTool` and `CommandTool`): Tool interfaces
   - `Entrypoint` and `ExitPoint`: Starting and ending points for a virtual model

2. **Set Up Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library (renamed from constructs)
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs (new)
   - `@ferment-ai/runtime`: Runtime implementation
   - `@ferment-ai/journal`: Journal system
   - `@ferment-ai/api`: API layer
   - `@ferment-ai/tools`: Tool implementations
   - `@ferment-ai/models`: Model integrations
   - `@ferment-ai/testing`: Testing utilities
   - `@ferment-ai/demo`: Demo application

3. **Configured TypeScript**: We have configured TypeScript for the project, including module resolution and other compiler options.

## Recent Decisions

1. **Using AWS CDK Constructs Library**: We're using the actual "constructs" npm package from AWS CDK as the foundation for our configuration system.

2. **Journal-Centric Architecture**: The journal will be the source of truth for the entire system state, containing all data needed to reconstruct agent contexts and continue execution.

3. **Stateless API Design**: The system will have no persistence and will rely on a stateless API, where the end user stores the entire journal and passes it to the API to resume a paused/canceled prompt.

4. **Package Structure**: We've organized the codebase into multiple packages to maintain separation of concerns and enable modular development.

5. **Tool Implementation with Zod**: We're using Zod for schema validation in our tools, which provides runtime type safety and clear error messages.

## Active Considerations

1. **Package Boundaries**: We have clarified the boundaries between the different packages:
   - **core-constructs-lib**: Defines the constructs using the Constructs library. It defines the relationship between agents and what they have access to, but does NOT define how to actually run the agent.
   - **core-constructs-runtime**: Defines how to run the constructs at runtime by binding to the Journal. It has a 1-to-1 relationship with core-constructs-lib.
   - **runtime**: Contains logic related to running the application as a whole. It sets up the journal, strings everything together, and allows the user to define what they want out of the agents.
   - **journal**: Defines the journal and the pubsub patterns around it, providing functionality to search, store, append, and compact the journal.
   - **runtime-types** (to be created): Will define interfaces that both core-constructs-runtime and runtime will implement.

2. **Runtime Module Architecture**: We need to implement a `CoreConstructsRuntimeModule` in the core-constructs-runtime package that:
   - Mounts everything in core-constructs-lib to the journal
   - Navigates the construct tree and marks each class as bound when a match is found
   - Contains separate classes for each thing that needs to be bound
   - Satisfies an interface defined in the runtime-types package

3. **Multiple Runtime Modules**: The CoreConstructsRuntimeModule itself should satisfy an interface found in the runtime-types package, and multiple runtime modules will be needed for different aspects of the system.

4. **Demo Application**: We have created a barebones demo application in 'packages/demo/src/main.ts' that shows how the app will be initialized and navigated. It demonstrates a two-agent model with a junior engineer and senior engineer that can communicate with each other.

5. **Journal Implementation**: We have implemented the Journal class as a pure runtime component (not a Construct) in the journal package. It provides a pub-sub model for event handling and serialization/deserialization for state persistence.

6. **Runtime Implementation**: We have implemented the `HttpApplication` class in the runtime package. This class extends `RootConstruct` and provides an HTTP API for the system.

7. **API Implementation**: We need to continue implementing the API layer that will expose the system to external clients.

## Next Steps

1. **Create Runtime-Types Package**: Create a new package that defines interfaces that both core-constructs-runtime and runtime will implement.

2. **Implement CoreConstructsRuntimeModule**: Create a single module in core-constructs-runtime that mounts everything in core-constructs-lib to the journal.

3. **Create Binding Classes**: Implement separate classes for each construct type that needs to be bound to the journal.

4. **Enhance Demo Application**: Further develop the demo application to showcase more features of the framework and demonstrate the full lifecycle from construct definition to execution.

5. **Fix TypeScript Errors**: Add type declarations for Express, CORS, and body-parser, and address other TypeScript errors in the implementation.

6. **Implement Testing**: Create unit tests for all components and develop integration tests for the complete system.

## Open Questions and Architectural Recommendations

1. **Processor/Runtime Module Interface Design**

   The best design for the processor/runtime module interface would be:
   
   - Create a `RuntimeModule` interface (not extending FermentConstruct) that represents a runtime resource
   - Implement a `ModuleProcessor` that parses constructs from the root node and binds listeners to the journal
   - Implement a `RuntimeExecutor` class to execute modules in dependency order
   - Create specific module implementations (ModelProcessor, ToolProcessor, etc.)
   - Use dependency declarations to validate module availability before execution
   
   **Validation of Construct Usage**:
   
   To identify if a construct defined in the tree is not actually bound to be used by a runtime module:
   
   1. Implement a tracking system during processing that marks constructs as "bound" when they're processed
   2. After processing, traverse the construct tree again to find any unmarked constructs
   3. Generate errors for any constructs that aren't bound to a runtime module
   4. Categorize constructs by type to provide specific warnings (e.g., "Tool X is defined but not used by any agent")
   5. Provide configuration to specify which constructs are allowed to be unbound
   
   ```typescript
   export interface RuntimeModule {
     readonly id: string;
     readonly version: string;
     readonly dependencies: RuntimeModuleDependency[];
     
     initialize(rootNode: Node): Promise<void>;
     validate(): Promise<ValidationResult>;
     execute(context: ExecutionContext): Promise<ExecutionResult>;
   }
   
   export class ModuleProcessor {
     private readonly modules: Map<string, RuntimeModule> = new Map();
     private readonly boundConstructs: Set<string> = new Set();
     
     constructor(private readonly journal: Journal) {}
     
     public processRootConstruct(rootConstruct: RootConstruct): void {
       // Parse the construct tree starting from the root
       const node = rootConstruct.node;
       
       // Find all relevant constructs and create appropriate runtime modules
       this.processNode(node);
       
       // Bind journal listeners for each module
       for (const module of this.modules.values()) {
         this.bindJournalListeners(module);
       }
       
       // Validate that all constructs are bound
       const validationResult = this.validateConstructBinding(node);
       if (validationResult.warnings.length > 0) {
         console.warn('Construct binding warnings:', validationResult.warnings);
       }
       if (validationResult.errors.length > 0) {
         console.error('Construct binding errors:', validationResult.errors);
       }
     }
     
     private processNode(node: Node): void {
       // Process this node and create a module if appropriate
       // When a construct is bound to a runtime module, mark it
       this.boundConstructs.add(node.id);
       
       // Process child nodes recursively
       for (const child of node.children) {
         this.processNode(child);
       }
     }
     
     private validateConstructBinding(node: Node): ValidationResult {
       const errors: ValidationError[] = [];
       const warnings: ValidationWarning[] = [];
       
       // Traverse the construct tree and check if all constructs are bound
       this.checkNodeBinding(node, warnings, errors);
       
       return { valid: errors.length === 0, errors, warnings };
     }
     
     private checkNodeBinding(node: Node, warnings: ValidationWarning[], errors: ValidationError[]): void {
       // Check if this node is bound
       if (!this.boundConstructs.has(node.id)) {
         const construct = node.host;
         
         // Different handling based on construct type
         if (construct instanceof Tool) {
           warnings.push({
             constructId: node.id,
             message: `Tool "${node.id}" is defined but not used by any agent`,
           });
         } else if (construct instanceof Model) {
           warnings.push({
             constructId: node.id,
             message: `Model "${node.id}" is defined but not used by any agent`,
           });
         } else if (construct instanceof AgentContext) {
           errors.push({
             constructId: node.id,
             message: `AgentContext "${node.id}" is defined but not bound to any runtime module`,
           });
         }
       }
       
       // Check child nodes recursively
       for (const child of node.children) {
         this.checkNodeBinding(child, warnings, errors);
       }
     }
     
     private bindJournalListeners(module: RuntimeModule): void {
       // Bind journal listeners for this module
       // ...
     }
   }
   ```

2. **HttpApplication Structure**

   The HttpApplication class should be structured as follows:
   
   - Extend RootConstruct to maintain the construct hierarchy
   - Use a ModuleProcessor to process constructs and create runtime modules
   - Implement a plugin architecture for middleware and route handlers
   - Provide flexible configuration options for server settings
   - Use event-based communication for loose coupling
   - Separate API routes into distinct handlers for better organization
   
   ```typescript
   export class HttpApplication extends RootConstruct {
     private readonly journal: Journal;
     private readonly moduleProcessor: ModuleProcessor;
     private readonly plugins: HttpPlugin[] = [];
     private server?: http.Server;
     
     constructor(scope: Construct, id: string, props: HttpApplicationProps = {}) {
       super(id);
       this.journal = new Journal(this, 'Journal', props.journalProps);
       this.moduleProcessor = new ModuleProcessor(this.journal);
       
       if (props.plugins) {
         for (const plugin of props.plugins) {
           this.addPlugin(plugin);
         }
       }
     }
     
     public addPlugin(plugin: HttpPlugin): void {
       this.plugins.push(plugin);
     }
     
     public serve(options: ServeOptions = {}): Promise<void> {
       // Initialize Express app
       // Configure middleware
       // Apply plugins
       // Set up routes
       // Start server
     }
   }
   ```

3. **Journal System Implementation**

   For efficient serialization/deserialization in the journal system:
   
   - Use a streaming architecture for processing large journals
   - Implement incremental updates to avoid full serialization/deserialization
   - Use a binary format like Protocol Buffers or MessagePack for efficiency
   - Implement compression for large journals
   - Use a schema-based approach for backward compatibility
   - Consider using a hybrid approach with a small in-memory cache and disk storage

4. **Context Window Limitations**

   To handle context window limitations in the runtime system:
   
   - Implement a sliding window approach for context management
   - Use relevance scoring to prioritize important messages
   - Implement summarization for older messages
   - Allow agents to explicitly manage their context
   - Use a hierarchical context structure with different levels of detail
   - Implement context pruning strategies based on token limits

5. **API Layer Implementation**

   For implementing the API layer with cross-client compatibility:
   
   - Use a RESTful API design with clear resource boundaries
   - Implement versioning for backward compatibility
   - Use Server-Sent Events (SSE) for real-time streaming
   - Provide comprehensive documentation with OpenAPI/Swagger
   - Implement proper error handling with standardized error responses
   - Use content negotiation for different formats (JSON, MessagePack)
   - Implement rate limiting and authentication/authorization

## Commands

To build and run the demo application:

```bash
npx nx build demo
npx nx serve demo
```