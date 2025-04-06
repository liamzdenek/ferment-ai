# Implementation Plan: Module System and Core Constructs Runtime

## Overview

This document outlines the necessary changes to implement the `.addModule` interface in the HttpApplication class and complete the core constructs runtime implementation. The goal is to enable proper mounting of runtime modules and give them access to the journal.

## Current Issues

1. **HttpApplication.addModule Interface**: 
   - The `app.addPlugin(createCoreConstructsRuntimeModule())` call in main.ts is using a placeholder implementation.
   - The core-constructs-runtime-module is just a shim with commented-out code.
   - We need to properly implement the module mounting mechanism to give modules access to the journal.

2. **Binding Classes Implementation**:
   - The binding class factory has syntax errors (undefined journal variable).
   - The binding classes for models, agent contexts, and tools need to be properly implemented.

3. **Core Constructs Runtime Implementation**:
   - The runtime module needs to be completed to properly bind constructs to the journal.

## Implementation Strategy

### 1. HttpApplication Class Updates

The HttpApplication class needs to be updated to add an `addModule` method that takes a RuntimeModule and adds it to the application. This method should replace the current `addPlugin` method to better reflect its purpose.

```typescript
/**
 * Adds a runtime module to the application
 * 
 * @param module The runtime module to add
 */
public addModule(module: RuntimeModule): void {
  // Store the module for later initialization
  this.modules.push(module);
}
```

The HttpApplication class should also be updated to initialize the modules during startup:

```typescript
/**
 * Serves the application over HTTP
 * 
 * @param options The serve options
 * @returns A promise that resolves when the server is started
 */
public serve(options: ServeOptions = {}): Promise<void> {
  // Process the construct tree
  this.moduleProcessor.processRootConstruct(this);
  
  // Initialize the modules
  for (const module of this.modules) {
    await module.initialize(this.node, this.journal);
  }
  
  // Create the Express app
  const app = express();
  
  // Configure middleware
  app.use(cors());
  app.use(bodyParser.json());
  
  // Apply plugins
  for (const plugin of this.plugins) {
    plugin.apply(app);
  }
  
  // Configure routes
  this.configureRoutes(app);
  
  // Start the server
  const port = options.port ?? 3000;
  const host = options.host ?? 'localhost';
  
  return new Promise<void>((resolve, reject) => {
    this.server = app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`);
      resolve();
    });
    
    this.server?.on('error', (error) => {
      reject(error);
    });
  });
}
```

### 2. Binding Class Factory Updates

The DefaultBindingClassFactory class needs to be updated to properly initialize with the journal:

```typescript
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
  ];
}
```

### 3. Core Constructs Runtime Module Updates

The createCoreConstructsRuntimeModule function needs to be updated to properly use the binding class factory:

```typescript
/**
 * Creates a core constructs runtime module
 * 
 * @returns A runtime module for core constructs
 */
export function createCoreConstructsRuntimeModule(): RuntimeModule {
  return {
    id: 'core-constructs',
    version: '1.0.0',
    dependencies: [
      {
        moduleId: 'journal',
        optional: false,
      },
    ],
    
    async initialize(rootNode: Node, journal: Journal): Promise<void> {
      // Create the binding class factory
      const bindingClassFactory = new DefaultBindingClassFactory(journal);
      
      // Create a setup map from constructor names to setup functions
      const setupMap: ConstructSetupMap = new Map();
      
      // Add setup functions for each binding class
      for (const bindingClass of bindingClassFactory.getAllBindingClasses()) {
        setupMap.set(bindingClass.constructType, async (node: Node, journal: Journal) => {
          const result = await bindingClass.bind(node);
          if (!result.success) {
            console.warn(`Failed to bind node ${node.id} with binding class ${bindingClass.id}: ${result.errors.map(e => e.message).join(', ')}`);
          }
        });
      }
      
      // Create the standard runtime module
      const standardModule = createStandardRuntimeModule({
        id: 'core-constructs',
        version: '1.0.0',
        dependencies: [
          {
            moduleId: 'journal',
            optional: false,
          },
        ],
        setupMap,
      });
      
      // Initialize the standard module
      await standardModule.initialize(rootNode, journal);
    }
  };
}
```

### 4. Main.ts Updates

The main.ts file needs to be updated to use the new `addModule` method instead of `addPlugin`:

```typescript
// Change this line:
app.addPlugin(createCoreConstructsRuntimeModule());

// To this:
app.addModule(createCoreConstructsRuntimeModule());
```

## Binding Class Implementations

### 1. ModelBinding

The ModelBinding class should be updated to properly extract information from the model and store it in the journal:

```typescript
protected async doBind(node: Node): Promise<BindingResult> {
  try {
    const model = node.host as any;
    
    // Extract model information
    const modelInfo = {
      id: node.id,
      type: node.constructor.name,
      modelId: model.modelId,
      parameters: model.parameters,
    };
    
    // Publish model information to the journal
    this.journal.publish(EventType.SYSTEM, this.id, {
      action: 'model_registered',
      model: modelInfo,
    });
    
    return this.createSuccessResult(node);
  } catch (error: any) {
    return this.createFailureResult(node, `Failed to bind model: ${error.message}`);
  }
}
```

### 2. AgentContextBinding

The AgentContextBinding class should be updated to properly extract information from the agent context and store it in the journal:

```typescript
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
    };
    
    // Publish agent context information to the journal
    this.journal.publish(EventType.SYSTEM, this.id, {
      action: 'agent_context_registered',
      agentContext: agentInfo,
    });
    
    return this.createSuccessResult(node);
  } catch (error: any) {
    return this.createFailureResult(node, `Failed to bind agent context: ${error.message}`);
  }
}
```

### 3. ToolBinding

The ToolBinding class should be updated to properly extract information from the tool and store it in the journal:

```typescript
protected async doBind(node: Node): Promise<BindingResult> {
  try {
    const tool = node.host as any;
    
    // Extract tool information
    const toolInfo = {
      id: node.id,
      type: node.constructor.name,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema ? JSON.stringify(tool.toJsonSchema().input_schema) : undefined,
      outputSchema: tool.outputSchema ? JSON.stringify(tool.toJsonSchema().output_schema) : undefined,
    };
    
    // Publish tool information to the journal
    this.journal.publish(EventType.SYSTEM, this.id, {
      action: 'tool_registered',
      tool: toolInfo,
    });
    
    return this.createSuccessResult(node);
  } catch (error: any) {
    return this.createFailureResult(node, `Failed to bind tool: ${error.message}`);
  }
}
```

## Module Processor Updates

The ModuleProcessor class should be updated to properly process runtime modules:

```typescript
/**
 * Processes a root construct
 * 
 * @param rootConstruct The root construct
 */
public processRootConstruct(rootConstruct: Construct): void {
  // Parse the construct tree starting from the root
  const node = rootConstruct.node;
  
  // Find all relevant constructs and create appropriate runtime modules
  this.processNode(node);
  
  // Validate that all constructs are bound
  const validationResult = this.validateConstructBinding(node);
  if (validationResult.warnings.length > 0) {
    console.warn('Construct binding warnings:', validationResult.warnings);
  }
  if (validationResult.errors.length > 0) {
    console.error('Construct binding errors:', validationResult.errors);
  }
}

/**
 * Executes the runtime modules
 * 
 * @returns The execution result
 */
public async execute(): Promise<ExecutionResult> {
  try {
    // Execute each module
    for (const module of this.modules.values()) {
      await module.initialize(this.node, this.journal);
    }

    return {
      success: true,
      errors: [],
      data: {},
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [error.message],
      data: {},
    };
  }
}
```

## Conclusion

By implementing these changes, we will enable the `.addModule` interface to work properly, allowing runtime modules to be mounted and given access to the journal. This will provide a solid foundation for building out the core constructs in the core-constructs-lib and their corresponding implementations in the core-constructs-runtime.