# Progress: Ferment AI

## Current Status

The project is entering a **rearchitecting phase**. We have decided to adopt a workflow-based architecture for the Journal, Modules, and Runtime library. This architecture allows for defining workflows as sequences of tasks with clear relationships, enabling modular and composable agent systems. We have created detailed implementation of the new architecture and are continuing to refine it.

## What Works

1. **Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library
   - `@ferment-ai/runtime-common`: Common interfaces and utilities for runtime packages
   - `@ferment-ai/runtime-in-memory`: In-memory implementation of the Journal
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs
   - `@ferment-ai/runtime-http`: HTTP server implementation
   - `@ferment-ai/demo`: Demo application

2. **Core Constructs**: We have implemented the core constructs for the system:
   - `FermentConstruct`: Base class for all Ferment constructs
   - `VirtualModel`: Top-level container for agent systems
   - `AgentContext`: Environment for a single agent
   - `Model` (with `OpenAIModel` and `AnthropicModel`): LLM provider interfaces
   - `Tool` (with `FileTool` and `CommandTool`): Tool interfaces
   - `Entrypoint` and `ExitPoint`: Starting and ending points for a virtual model
   - `SendEmailTool`: Tool for sending messages between agents
   - `ExitPointTool`: Tool for finishing virtual model execution

3. **TypeScript Configuration**: We have configured TypeScript for the project, including module resolution and other compiler options.

4. **Dependencies**: We have installed the necessary dependencies, including:
   - `constructs`: AWS CDK constructs library
   - `zod`: Schema validation library
   - `zod-to-json-schema`: Converts Zod schemas to JSON Schema

5. **Workflow Architecture Design**: We have designed a new architecture based on workflows and tasks:
   - **Journal**: The central executor that runs workflows and maintains state
   - **Workflow**: A sequence of tasks with defined relationships
   - **Task**: A unit of work in a workflow
   - **Module**: A function that maps constructs to task functions
   - **Compiler**: A function that extracts workflows from the construct tree

6. **Workflow and Task Implementation**: We have implemented the core classes for the workflow architecture:
   - **Workflow**: A class that represents a sequence of tasks
   - **Task**: A class that represents a unit of work in a workflow
   - **EndTask**: A specialized task that represents the end of a workflow
   - **WorkflowDefinition**: An interface for serializable workflow definitions
   - **TaskDefinition**: An interface for serializable task definitions

7. **Journal Implementation**: We have implemented the Journal class that executes workflows and maintains state:
   - **executeWorkflow**: A method that executes a workflow and yields events
   - **toSavedState**: A method that serializes the journal state
   - **fromSavedState**: A method that deserializes the journal state
   - **addModule**: A method that adds a module to the journal

8. **Module System**: We have implemented a module system that maps constructs to task functions:
   - **Module**: An interface for modules that map constructs to task functions
   - **createCoreConstructsModule**: A function that creates a module for core constructs
   - **TaskFunction**: A type for functions that execute tasks

9. **Compiler Implementation**: We have implemented a compiler that extracts workflows from the construct tree:
   - **compileWorkflows**: A function that extracts workflows from the construct tree
   - **findWorkflows**: A function that finds workflow constructs in the construct tree
   - **findWorkflowConstructs**: A function that finds workflow constructs in the construct tree
   - **findEntrypoints**: A function that finds entrypoint constructs in the construct tree

## What's Left to Build

### Phase 1: Workflow Foundation (Completed)

- [x] **New Journal Implementation**
  - [x] Create Journal class with workflow support
  - [x] Implement workflow execution
  - [x] Implement task execution
  - [x] Implement state serialization/deserialization
  - [x] Implement module system

- [x] **Workflow and Task Classes**
  - [x] Create Workflow class
  - [x] Create Task class
  - [x] Create EndTask class
  - [x] Implement task relationships
  - [x] Implement workflow serialization

- [x] **Module System**
  - [x] Create Module interface
  - [x] Implement mapping of constructs to task functions
  - [x] Create CoreConstructsModule

- [x] **Compiler Implementation**
  - [x] Create compileWorkflows function
  - [x] Implement workflow extraction from construct tree
  - [x] Implement fallback to create workflows from entrypoints

### Phase 2: Integration with Core Constructs (In Progress)

- [x] **AgentContext Integration**
  - [x] Add newPromptTask method to AgentContext
  - [x] Implement sendEmailTool method
  - [ ] Add support for other agent operations

- [ ] **Task Function Implementation**
  - [x] Create task functions for agent contexts
  - [x] Create task functions for models
  - [ ] Create task functions for tools
  - [ ] Create task functions for entrypoints and exit points

- [ ] **Workflow Execution**
  - [x] Implement basic workflow execution
  - [ ] Add support for complex task relationships
  - [ ] Implement error handling and recovery
  - [ ] Add support for streaming responses

### Phase 3: Advanced Features (Planned)

- [ ] **Real Agent Execution**
  - [ ] Connect task functions to actual LLM API calls
  - [ ] Implement proper handling of agent responses
  - [ ] Add support for streaming responses from agents

- [ ] **Enhanced Tool System**
  - [ ] Implement actual tool execution logic
  - [ ] Add support for tool parameters validation
  - [ ] Create a mechanism for tools to return results to agents

- [ ] **Additional Task Types**
  - [ ] Create specialized task types for common operations
  - [ ] Implement task composition for complex workflows
  - [ ] Develop a library of reusable tasks

### Phase 4: Performance and Reliability (Planned)

- [ ] **Performance Optimization**
  - [ ] Optimize workflow execution
  - [ ] Implement efficient serialization
  - [ ] Reduce memory usage

- [ ] **Error Handling and Recovery**
  - [ ] Add robust error handling in task functions
  - [ ] Implement recovery mechanisms for failed tasks
  - [ ] Create a transaction-like system for atomic operations

- [ ] **Monitoring and Debugging**
  - [ ] Implement a visualization tool for workflows
  - [ ] Add metrics collection for performance analysis
  - [ ] Create a debugging interface for inspecting tasks and their state

## Recent Improvements

1. **Implemented Workflow and Task Classes**:
   - Created the Workflow class to represent a sequence of tasks
   - Created the Task class to represent a unit of work in a workflow
   - Added methods for defining task relationships (canCall, canCallAndReturn)
   - Implemented serialization of workflows to workflow definitions
   - Updated to use full paths for task IDs in the tasks map and entryPoints map

2. **Implemented Journal Class**:
   - Created the Journal class to execute workflows and maintain state
   - Added methods for executing workflows and serializing/deserializing state
   - Implemented module-based initialization
   - Updated to store the whole CompileWorkflowsResult instead of decomposing it

3. **Implemented Module Interface**:
   - Created the Module interface for mapping constructs to task functions
   - Implemented the core-constructs-runtime module for mapping core constructs
   - Added task functions for AgentContext, OpenAIModel, and prompt tasks
   - Removed workflow-related task functions that are implied by object references

4. **Implemented Compiler**:
   - Created the compileWorkflows function to extract workflows from the construct tree
   - Added support for finding workflow constructs and their tasks
   - Updated to use full paths for task functions instead of just IDs
   - Fixed the implementation of compileWorkflow to properly handle both calling patterns

5. **Simplified Architecture**:
   - Removed the Entrypoint class as it's redundant
   - The first task in a Definition now serves as the entrypoint

## Known Issues

1. **Performance Concerns**: The workflow-based architecture may introduce performance overhead, especially for complex workflows with many tasks.

2. **Learning Curve**: The workflow-based architecture introduces new concepts that may require a learning curve for developers familiar with the current architecture.

3. **Task Path Management**: Using full paths for task references requires careful management of the construct tree structure to avoid path conflicts.

4. **Workflow Execution Complexity**: The implementation of workflow execution with both calling patterns (canCall and canCallAndReturn) adds complexity that needs to be carefully tested.

## Next Milestones

1. **Complete Task Function Implementation** (Target: Week 1)
   - Create task functions for all construct types
   - Implement proper execution of tasks
   - Add support for error handling and recovery

2. **Enhance Workflow Execution** (Target: Week 1)
   - Implement support for complex task relationships
   - Add support for conditional execution
   - Create a mechanism for sharing state between tasks

3. **Implement Real Agent Execution** (Target: Week 2)
   - Connect task functions to actual LLM API calls
   - Implement proper handling of agent responses
   - Add support for streaming responses from agents

4. **Enhance Tool System** (Target: Week 2)
   - Implement actual tool execution logic
   - Add support for tool parameters validation
   - Create a mechanism for tools to return results to agents

5. **Add Support for More Task Types** (Target: Week 3)
   - Create specialized task types for common operations
   - Implement task composition for complex workflows
   - Develop a library of reusable tasks

6. **Implement System for Managing Task Relationships** (Target: Week 3)
   - Create a relationship registry in the Journal
   - Add methods for querying related tasks
   - Implement visualization tools for task relationships

7. **Add Serialization Optimizations** (Target: Week 4)
   - Implement compression for large journal states
   - Add support for partial serialization (only changed state)
   - Create a more efficient format for serialization

8. **Improve Error Handling and Recovery** (Target: Week 4)
   - Add more robust error handling in task functions
   - Implement recovery mechanisms for failed tasks
   - Create a transaction-like system for atomic operations

## Demo Applications

### Main Demo

A demo application has been created in 'packages/demo/src/main.ts' that shows how the app will be initialized and navigated. It demonstrates a two-agent model with a junior engineer and senior engineer that can communicate with each other. This demo uses the new workflow-based architecture.

To build and run the main demo application:

```bash
npx nx build demo
npx nx serve demo
```

### HTTP Application Demo

An HTTP application demo has been created in 'packages/runtime-http/src/examples/http-server.ts' that shows how to use the HttpApplication class from the runtime package. It demonstrates how to create a virtual model and serve it over HTTP. This demo will be updated to use the new workflow-based architecture.

To build and run the HTTP application demo:

```bash
npx nx build runtime-http
node packages/runtime-http/dist/examples/http-server.js