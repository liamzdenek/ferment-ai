# Progress: Ferment AI

## Current Status

The project is entering a **rearchitecting phase**. We have decided to adopt an Entity-Component-System (ECS) architecture for the Journal, Modules, and Runtime library. This architecture draws inspiration from game development but is tailored for a real-time, event-driven system where we want to avoid processing Agents that aren't doing work. We have created detailed design documents for the new architecture and are preparing to implement it.

## What Works

1. **Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library
   - `@ferment-ai/runtime-common`: Common interfaces and utilities for runtime packages
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs
   - `@ferment-ai/runtime`: Runtime implementation
   - `@ferment-ai/journal`: Journal system
   - `@ferment-ai/api`: API layer
   - `@ferment-ai/tools`: Tool implementations
   - `@ferment-ai/models`: Model integrations
   - `@ferment-ai/testing`: Testing utilities
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

5. **ECS Architecture Design**: We have designed a new architecture based on the Entity-Component-System pattern:
   - **Journal**: The central "World" that stores all entities, components, systems, and processes
   - **Entity**: A unique identifier with associated components
   - **Component**: Pure data objects attached to entities
   - **System**: Event-based callbacks that respond to journal events and create Processes
   - **Process**: Represents operations like agent calls and tool calls
   - **Module**: A function that converts constructs into entities, components, systems, etc.
   - **Entrypoint**: Defines how to start an execution of a journal

## What's Left to Build

### Phase 1: ECS Foundation (Completed)

- [x] **New Journal Implementation**
  - [x] Create Journal class with ECS support
  - [x] Implement entity management
  - [x] Implement component management
  - [x] Implement system management
  - [x] Implement process management
  - [x] Implement event handling
  - [x] Implement serialization/deserialization

- [x] **Module System**
  - [x] Create Module interface
  - [x] Implement initializeJournal function
  - [x] Create CoreConstructsModule

- [x] **HttpApplication Updates**
  - [x] Update HttpApplication to use new Journal
  - [x] Implement execute endpoint with async iterable
  - [x] Update state endpoint for full serialization

### Phase 2: Component and System Implementation (Completed)

- [x] **Core Components**
  - [x] Create AgentComponent
  - [x] Create ModelComponent
  - [x] Create ToolComponent
  - [x] Create EntrypointComponent
  - [x] Create ExitPointComponent

- [x] **Core Systems**
  - [x] Create AgentSystem
  - [x] Create ToolSystem
  - [x] Create EntrypointSystem
  - [x] Create ExitPointSystem

- [x] **Process Implementation**
  - [x] Create AgentProcess
  - [x] Create ToolProcess
  - [x] Implement process lifecycle management
### Phase 3: Migration and Integration (Completed)

- [x] **Construct to Entity Conversion**
  - [x] Implement conversion of AgentContext to entities/components
  - [x] Implement conversion of Model to entities/components
  - [x] Implement conversion of Tool to entities/components
  - [x] Implement conversion of Entrypoint to entities/components
  - [x] Implement conversion of ExitPoint to entities/components

- [x] **Demo Application Updates**
  - [x] Update demo to use new ECS architecture
  - [x] Create examples of different entity/component configurations
  - [x] Demonstrate process creation and execution
  - [ ] Demonstrate process creation and execution
### Phase 4: Refinement and Enhancement (In Progress)

- [x] **Basic Implementation**
  - [x] Implement basic entity/component lookups
  - [x] Implement basic serialization
  - [x] Implement basic memory management

- [ ] **Documentation**
  - [x] Document ECS architecture
  - [ ] Create API references
  - [ ] Write usage examples
  - [ ] Develop tutorials

- [ ] **Testing**
  - [x] Create basic unit tests
  - [ ] Develop comprehensive integration tests
  - [ ] Implement performance tests

### Phase 5: Advanced Features (Planned)

- [ ] **Real Agent Execution**
  - [ ] Connect to actual LLM API calls
  - [ ] Implement proper handling of agent responses
  - [ ] Add support for streaming responses

- [ ] **Enhanced Tool System**
  - [ ] Implement actual tool execution logic
  - [ ] Add support for tool parameters validation
  - [ ] Create mechanism for tools to return results to agents

- [ ] **Additional Component Types**
  - [ ] Create MemoryComponent for agent memory
  - [ ] Implement ContextComponent for managing context windows
  - [ ] Develop CapabilityComponent for defining entity capabilities

### Phase 6: Performance and Reliability (Planned)

- [ ] **Performance Optimization**
  - [ ] Optimize entity/component lookups
  - [ ] Implement efficient serialization
  - [ ] Reduce memory usage

- [ ] **Error Handling and Recovery**
  - [ ] Add robust error handling in systems and processes
  - [ ] Implement recovery mechanisms for failed processes
  - [ ] Create transaction-like system for atomic operations

- [ ] **Monitoring and Debugging**
  - [ ] Implement visualization tool for journal state
  - [ ] Add metrics collection for performance analysis
  - [ ] Create debugging interface for inspecting entities and components
  - [ ] Implement performance tests

## Known Issues

1. **Architecture Transition**: We need to carefully manage the transition from the current architecture to the new ECS architecture to avoid breaking existing functionality.

2. **Performance Concerns**: The ECS architecture may introduce performance overhead, especially for serialization/deserialization of the full state.

3. **Compatibility**: We need to ensure that the new architecture is compatible with existing code that uses the current architecture.

4. **Learning Curve**: The ECS architecture introduces new concepts that may require a learning curve for developers familiar with the current architecture.

## Next Milestones

1. **Implement Real Agent Execution** (Target: Week 1)
   - Connect the agent system to actual LLM API calls
   - Implement proper handling of agent responses
   - Add support for streaming responses from agents

2. **Enhance Tool System** (Target: Week 1)
   - Implement actual tool execution logic
   - Add support for tool parameters validation
   - Create a mechanism for tools to return results to agents

3. **Add Support for More Component Types** (Target: Week 2)
   - Create MemoryComponent for agent memory
   - Implement ContextComponent for managing context windows
   - Develop CapabilityComponent for defining what an entity can do

4. **Implement System for Managing Entity Relationships** (Target: Week 2)
   - Create a relationship registry in the Journal
   - Add methods for querying related entities
   - Implement visualization tools for entity relationships

5. **Add Serialization Optimizations** (Target: Week 3)
   - Implement actual compression for large journals
   - Add support for partial serialization (only changed components)
   - Create a more efficient binary format for serialization

6. **Improve Error Handling and Recovery** (Target: Week 3)
   - Add more robust error handling in systems and processes
   - Implement recovery mechanisms for failed processes
   - Create a transaction-like system for atomic operations

7. **Add Monitoring and Debugging Tools** (Target: Week 4)
   - Implement a visualization tool for the journal state
   - Add metrics collection for performance analysis
   - Create a debugging interface for inspecting entities and components

8. **Extend Module System** (Target: Week 4)
   - Add support for module dependencies and loading order
   - Implement a plugin system for third-party modules
   - Create a registry for discovering available modules

## Demo Applications

### Main Demo

A barebones demo application has been created in 'packages/demo/src/main.ts' that shows how the app will be initialized and navigated. It demonstrates a two-agent model with a junior engineer and senior engineer that can communicate with each other. This demo will be updated to use the new ECS architecture.

To build and run the main demo application:

```bash
npx nx build demo
npx nx serve demo
```

### HTTP Application Demo

An HTTP application demo has been created in 'packages/demo/src/http-app-example.ts' that shows how to use the HttpApplication class from the runtime package. It demonstrates how to create a virtual model and serve it over HTTP. This demo will be updated to use the new ECS architecture.

To build and run the HTTP application demo:

```bash
npx nx build demo
node packages/demo/dist/http-app-example.js
```

We have also created examples for the Journal and HttpApplication components to demonstrate their usage:

- `packages/journal/src/examples/journal-example.ts`: Shows how to use the Journal class for event publishing and subscription
- `packages/runtime/src/examples/http-server.ts`: Shows how to use the HttpApplication class to create an HTTP API

These examples will be updated to use the new ECS architecture.