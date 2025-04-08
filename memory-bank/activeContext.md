# Active Context: Ferment AI

## Current Focus

We are rearchitecting the Journal, Modules, and Runtime library using an event-oriented variant of the Entity-Component-System (ECS) pattern. This architecture draws inspiration from game development but is tailored for a real-time, event-driven system where we want to avoid processing Agents that aren't doing work.

1. **Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library
   - `@ferment-ai/runtime-interfaces`: Common interfaces and utilities for runtime packages
   - `@ferment-ai/runtime-hooks`: React-like hooks for system state management
   - `@ferment-ai/runtime-in-memory`: In-memory implementation of the Journal
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs
   - `@ferment-ai/runtime-http`: HTTP server implementation
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

8. **React-like Hooks for Systems**: Systems will use React-like hooks for state management and event handling, making them more declarative and easier to reason about.

9. **Enhanced Event Contract**: Events now include more metadata such as event ID, event type, source construct name, source construct type, source system name, and parent event ID.

10. **Process Attachment**: Processes can be attached to systems, which will queue events for that system until the process completes.

## Active Considerations

1. **Journal Implementation**: The new Journal class will be the central component of the architecture, responsible for managing entities, components, systems, and processes. It will provide methods for creating and managing entities, adding and retrieving components, registering systems, creating and managing processes, publishing events, and serializing/deserializing the full state.

2. **Entity and Component Design**: Entities will be simple objects with just an ID, and components will be pure data objects with a type field and additional fields specific to the component type. Components will not have methods; instead, functions will operate on component data.

3. **System Implementation**: Systems will be objects with a unique ID, an array of event types they handle, and an execute method that takes the journal and an event. Systems will query the journal for entities with specific components and create processes as needed.

4. **Process Lifecycle**: Processes will be objects with a unique ID, a type, a status, start and end timestamps, and a result object when completed. Processes will be independent with no direct dependencies and will communicate through journal events.

5. **Module Interface**: Modules will be objects with a unique ID, a version, and an initialize method that takes a RootConstruct and a Journal. The initialize method will traverse the construct tree recursively, create entities and components based on the constructs, register systems with the journal, and mark constructs as bound.

6. **HttpApplication Integration**: The HttpApplication class will still extend RootConstruct but will use the new Journal implementation. It will provide an initialize method that creates a journal and initializes it with the modules, and a serve method that creates an Express app and configures routes for executing the journal and getting its state.

7. **Hook-based System State Management**: Systems will use React-like hooks for state management, making it easier to manage complex state and side effects. This includes hooks like useState, useEffect, useEventCallback, and useAttachProcess.

8. **Event Filtering**: The event filtering system has been enhanced to allow filtering on any attribute in the event, making it more flexible and powerful.

## Recent Changes

1. **Fixed HTTP Application Initialization**:
   - Added proper conversion of initialState from plain objects to Maps and Sets in the HTTP application
   - Enhanced error logging in the HTTP application to better diagnose issues
   - Fixed the "Cannot read properties of undefined (reading 'set')" error

2. **Improved Entrypoint Payload Handling**:
   - Updated the Journal interface to accept an initialPayload parameter in the execute method
   - Modified the JournalImpl to use the provided initialPayload when executing an entrypoint
   - Added logging throughout the execution flow to track payload propagation

3. **Enhanced System Logging**:
   - Added detailed logging in the entrypoint system to show the received initialPayload
   - Added logging in the agent system to show the input received for each agent
   - Improved error handling and reporting throughout the system

4. **Refactored Event Contract**:
   - Enhanced the event interface to include more metadata
   - Added event type definitions with Zod schemas for validation
   - Implemented type guards for event types
   - Added event registration with the journal

5. **Implemented Hook-based Systems**:
   - Created a React-like hook system for state management
   - Implemented useState, useEffect, useEventCallback, and other hooks
   - Refactored systems to use hooks for state management and event handling
   - Added process attachment to systems for event queueing

## Next Steps

1. **Implement Real Agent Execution**:
   - Connect the agent system to actual LLM API calls
   - Implement proper handling of agent responses
   - Add support for streaming responses from agents

2. **Enhance Tool System**:
   - Implement actual tool execution logic
   - Add support for tool parameters validation
   - Create a mechanism for tools to return results to agents

3. **Add Support for More Component Types**:
   - Create MemoryComponent for agent memory
   - Implement ContextComponent for managing context windows
   - Develop CapabilityComponent for defining what an entity can do

4. **Implement System for Managing Entity Relationships**:
   - Create a relationship registry in the Journal
   - Add methods for querying related entities
   - Implement visualization tools for entity relationships

5. **Add Serialization Optimizations**:
   - Implement actual compression for large journals
   - Add support for partial serialization (only changed components)
   - Create a more efficient binary format for serialization

6. **Improve Error Handling and Recovery**:
   - Add more robust error handling in systems and processes
   - Implement recovery mechanisms for failed processes
   - Create a transaction-like system for atomic operations

7. **Add Monitoring and Debugging Tools**:
   - Implement a visualization tool for the journal state
   - Add metrics collection for performance analysis
   - Create a debugging interface for inspecting entities and components

8. **Extend Module System**:
   - Add support for module dependencies and loading order
   - Implement a plugin system for third-party modules
   - Create a registry for discovering available modules

9. **Enhance Hook System**:
   - Add more specialized hooks for common patterns
   - Implement memoization hooks for performance optimization
   - Create debugging tools for hook usage

10. **Improve Event System**:
    - Add support for event batching
    - Implement event prioritization
    - Create event replay capabilities for debugging

## Open Questions

1. **Component Granularity**: How fine-grained should our components be? Should we have a single component for an agent, or should we break it down into smaller components like prompt, model, tools, etc.?

2. **System Triggering**: What's the best way to trigger systems? Should they register for specific event types, or should we have a more generic event system with filtering?

3. **Process Dependencies**: How should we handle dependencies between processes? Should we have explicit dependencies, or should we rely on the event system?

4. **Serialization Format**: What's the most efficient format for serializing the journal state? Should we use JSON, a binary format like Protocol Buffers or MessagePack, or something else?

5. **Performance Optimization**: How can we optimize the performance of the system, especially for large journals with many entities and components?

6. **Hook System Limitations**: What are the limitations of the hook-based approach for system state management? How can we address these limitations?

7. **Event Contract Evolution**: How should we handle changes to the event contract over time? Should we version events, or should we have a more flexible schema?

## Commands

To build and run the demo application:

```bash
npx nx build demo
npx nx serve demo
