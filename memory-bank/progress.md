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

### Phase 1: ECS Foundation (In Progress)

- [ ] **New Journal Implementation**
  - [ ] Create Journal class with ECS support
  - [ ] Implement entity management
  - [ ] Implement component management
  - [ ] Implement system management
  - [ ] Implement process management
  - [ ] Implement event handling
  - [ ] Implement serialization/deserialization

- [ ] **Module System**
  - [ ] Create Module interface
  - [ ] Implement initializeJournal function
  - [ ] Create CoreConstructsModule

- [ ] **HttpApplication Updates**
  - [ ] Update HttpApplication to use new Journal
  - [ ] Implement execute endpoint with async iterable
  - [ ] Update state endpoint for full serialization

### Phase 2: Component and System Implementation

- [ ] **Core Components**
  - [ ] Create AgentComponent
  - [ ] Create ModelComponent
  - [ ] Create ToolComponent
  - [ ] Create EntrypointComponent
  - [ ] Create ExitPointComponent

- [ ] **Core Systems**
  - [ ] Create AgentSystem
  - [ ] Create ToolSystem
  - [ ] Create EntrypointSystem
  - [ ] Create ExitPointSystem

- [ ] **Process Implementation**
  - [ ] Create AgentProcess
  - [ ] Create ToolProcess
  - [ ] Implement process lifecycle management

### Phase 3: Migration and Integration

- [ ] **Construct to Entity Conversion**
  - [ ] Implement conversion of AgentContext to entities/components
  - [ ] Implement conversion of Model to entities/components
  - [ ] Implement conversion of Tool to entities/components
  - [ ] Implement conversion of Entrypoint to entities/components
  - [ ] Implement conversion of ExitPoint to entities/components

- [ ] **Demo Application Updates**
  - [ ] Update demo to use new ECS architecture
  - [ ] Create examples of different entity/component configurations
  - [ ] Demonstrate process creation and execution

### Phase 4: Refinement and Enhancement

- [ ] **Performance Optimization**
  - [ ] Optimize entity/component lookups
  - [ ] Implement efficient serialization
  - [ ] Reduce memory usage

- [ ] **Documentation**
  - [ ] Document ECS architecture
  - [ ] Create API references
  - [ ] Write usage examples
  - [ ] Develop tutorials

- [ ] **Testing**
  - [ ] Create unit tests for Journal, Entity, Component, System, Process
  - [ ] Develop integration tests for the complete system
  - [ ] Implement performance tests

## Known Issues

1. **Architecture Transition**: We need to carefully manage the transition from the current architecture to the new ECS architecture to avoid breaking existing functionality.

2. **Performance Concerns**: The ECS architecture may introduce performance overhead, especially for serialization/deserialization of the full state.

3. **Compatibility**: We need to ensure that the new architecture is compatible with existing code that uses the current architecture.

4. **Learning Curve**: The ECS architecture introduces new concepts that may require a learning curve for developers familiar with the current architecture.

## Next Milestones

1. **Implement New Journal Class** (Target: Week 1)
   - Create Journal class with ECS support
   - Implement entity, component, system, and process management
   - Implement event handling
   - Implement serialization/deserialization

2. **Create Module System** (Target: Week 1)
   - Create Module interface
   - Implement initializeJournal function
   - Create CoreConstructsModule

3. **Update HttpApplication** (Target: Week 2)
   - Update HttpApplication to use new Journal
   - Implement execute endpoint with async iterable
   - Update state endpoint for full serialization

4. **Implement Core Components and Systems** (Target: Week 2)
   - Create components for each construct type
   - Create systems for each operation
   - Implement process lifecycle management

5. **Update Demo Application** (Target: Week 3)
   - Update demo to use new ECS architecture
   - Create examples of different entity/component configurations
   - Demonstrate process creation and execution

6. **Create Documentation and Tests** (Target: Week 4)
   - Document ECS architecture
   - Create API references
   - Write unit and integration tests
   - Develop tutorials

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