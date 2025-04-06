# Active Context: Ferment AI

## Current Focus

We are rearchitecting the Journal, Modules, and Runtime library using an event-oriented variant of the Entity-Component-System (ECS) pattern. This architecture draws inspiration from game development but is tailored for a real-time, event-driven system where we want to avoid processing Agents that aren't doing work.

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

2. **ECS Architecture Design**: We have designed a new architecture based on the Entity-Component-System pattern:
   - **Journal**: The central "World" that stores all entities, components, systems, and processes
   - **Entity**: A unique identifier with associated components
   - **Component**: Pure data objects attached to entities
   - **System**: Event-based callbacks that respond to journal events and create Processes
   - **Process**: Represents operations like agent calls and tool calls
   - **Module**: A function that converts constructs into entities, components, systems, etc.
   - **Entrypoint**: Defines how to start an execution of a journal

3. **Implementation Approach**: We have created detailed implementation plans for the new architecture:
   - `ecs-architecture-proposal.md`: High-level overview of the new architecture
   - `ecs-implementation-approach.md`: Detailed implementation approach for each component
   - `ecs-migration-guide.md`: Strategy for migrating from the old architecture to the new one

## Recent Decisions

1. **Entity-Component-System Pattern**: We've decided to adopt the ECS pattern for our architecture, where entities are just identifiers, components are pure data, and systems contain the logic.

2. **Journal as World**: The Journal will now represent the "World" within the ECS pattern, storing all entities, components, systems, and processes.

3. **Process-Based Execution**: Agent calls, tool calls, etc. will be represented as processes with a clear lifecycle (created, running, completed, failed).

4. **Module-Based Initialization**: Constructs will be converted to entities, components, and systems by modules during initialization.

5. **Async Iterable Execution**: The Journal's execute method will be an async iterable that yields events as they happen, allowing for real-time streaming.

6. **Full State Serialization**: The Journal will serialize not just events but also the state of entities, components, systems, and processes.

7. **Construct Binding Validation**: Modules must mark constructs as "bound" by calling a function on the journal, and a validation function will throw errors if there are any unbound constructs.

## Active Considerations

1. **Journal Implementation**: The new Journal class will be the central component of the architecture, responsible for managing entities, components, systems, and processes. It will provide methods for creating and managing entities, adding and retrieving components, registering systems, creating and managing processes, publishing events, and serializing/deserializing the full state.

2. **Entity and Component Design**: Entities will be simple objects with just an ID, and components will be pure data objects with a type field and additional fields specific to the component type. Components will not have methods; instead, functions will operate on component data.

3. **System Implementation**: Systems will be objects with a unique ID, an array of event types they handle, and an execute method that takes the journal and an event. Systems will query the journal for entities with specific components and create processes as needed.

4. **Process Lifecycle**: Processes will be objects with a unique ID, a type, a status, start and end timestamps, and a result object when completed. Processes will be independent with no direct dependencies and will communicate through journal events.

5. **Module Interface**: Modules will be objects with a unique ID, a version, and an initialize method that takes a RootConstruct and a Journal. The initialize method will traverse the construct tree recursively, create entities and components based on the constructs, register systems with the journal, and mark constructs as bound.

6. **HttpApplication Integration**: The HttpApplication class will still extend RootConstruct but will use the new Journal implementation. It will provide an initialize method that creates a journal and initializes it with the modules, and a serve method that creates an Express app and configures routes for executing the journal and getting its state.

## Next Steps

1. **Create New Journal Implementation**:
   - Implement the new Journal class with ECS support
   - Create interfaces for Entity, Component, System, and Process
   - Implement serialization and deserialization of the full state

2. **Create Module System**:
   - Implement the Module interface
   - Create the initializeJournal function
   - Implement the CoreConstructsModule

3. **Update HttpApplication**:
   - Update the HttpApplication class to use the new Journal
   - Implement the execute endpoint with async iterable streaming
   - Update the state endpoint to return the full serialized state

4. **Migrate Existing Functionality**:
   - Create components for each construct type (AgentContext, Model, Tool, etc.)
   - Create systems for each operation (agent invocation, tool execution, etc.)
   - Update the demo application to use the new architecture

5. **Testing and Documentation**:
   - Create unit tests for all components
   - Develop integration tests for the complete system
   - Update documentation to reflect the new architecture

## Open Questions

1. **Component Granularity**: How fine-grained should our components be? Should we have a single component for an agent, or should we break it down into smaller components like prompt, model, tools, etc.?

2. **System Triggering**: What's the best way to trigger systems? Should they register for specific event types, or should we have a more generic event system with filtering?

3. **Process Dependencies**: How should we handle dependencies between processes? Should we have explicit dependencies, or should we rely on the event system?

4. **Serialization Format**: What's the most efficient format for serializing the journal state? Should we use JSON, a binary format like Protocol Buffers or MessagePack, or something else?

5. **Performance Optimization**: How can we optimize the performance of the system, especially for large journals with many entities and components?

## Commands

To build and run the demo application:

```bash
npx nx build demo
npx nx serve demo