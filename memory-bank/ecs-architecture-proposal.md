# Entity-Component-System Architecture Proposal

## Overview

This document outlines a proposal for rearchitecting the Journal, Modules, and Runtime library using an event-oriented variant of the Entity-Component-System (ECS) pattern. This architecture draws inspiration from game development but is tailored for a real-time, event-driven system where we want to avoid processing Agents that aren't doing work.

## Core Concepts

### Journal

The Journal represents the "World" within the ECS pattern. It serves as the central source of truth for storing all entities, components, systems, processes, etc. It maintains its append-only nature and provides methods for creating and managing entities, components, systems, and processes.

The Journal would provide:
- Entity creation and management
- Component attachment and retrieval
- System registration and execution
- Process creation and lifecycle management
- Event publishing and subscription
- Serialization and deserialization of the entire state
- Validation of construct binding

### Entity

An Entity is simply a unique identifier with associated components. Agents will be entities, and possibly other elements as well. Entities have no behavior of their own; all functionality comes from their associated components and the systems that operate on them.

Entities would be lightweight objects with just an ID, with all data stored in components.

### Component

Components are pure data objects that attach to Entities to store data about the entity. Each entity can have at most one component of each type. For example, an entity might have an "OpenAI Agent" component that stores the model ID, prompt, and parameters.

Components would be simple data structures with no methods, following a functional approach rather than OOP inheritance.

### System

Systems are event-based callbacks that respond to journal events and create Processes. They contain the logic for operating on entities with specific components. For example, an AgentSystem might respond to AGENT_INVOKE events and create a process to invoke the agent.

Systems would:
- Register for specific event types
- Query for entities with specific components
- Create and manage processes
- Publish events to the journal

### Process

Processes represent operations like agent calls and tool calls. They have a start invocation and either fail or succeed with a single result, similar to a promise. The output of a Process is writing events to the journal, which can trigger more systems, which can trigger more processes.

Processes would:
- Have a unique ID
- Track their status (created, running, completed, failed)
- Store their result when completed
- Be independent with no direct dependencies

### Module

A Module is a function that takes a RootConstruct, parses the entire tree, and converts it into entities, components, systems, processes, etc., and attaches those to the Journal. This is a one-time conversion at initialization. Modules must mark Constructs as "Bound" by calling a function on the journal.

Modules would:
- Have a unique ID and version
- Process the construct tree recursively
- Create entities and components based on constructs
- Register systems with the journal
- Mark constructs as bound

### Entrypoint

Entrypoints define how to start an execution of a journal. They are implemented as components attached to entities.

## Key Interactions

### Initialization Flow

1. The HttpApplication is created as a RootConstruct
2. Modules are added to the HttpApplication
3. The initializeJournal function is called with the RootConstruct and modules
4. Each module processes the construct tree and creates entities, components, and systems
5. The journal validates that all constructs are bound
6. The journal is returned, ready for execution

### Execution Flow

1. The journal's execute method is called with an entrypoint ID
2. The journal finds the entrypoint entity and creates an initial event
3. Systems that handle the event type are executed
4. Systems create processes as needed
5. Processes publish events to the journal when they complete
6. The journal continues processing events until there are no more active processes
7. Each event is yielded as part of an async iterable, allowing for real-time streaming

### HTTP Integration

1. The HttpApplication serves the journal over HTTP
2. The /execute endpoint accepts an entrypoint ID and initial state
3. The journal is initialized with the initial state
4. The journal's execute method is called with the entrypoint ID
5. Events are streamed to the client using Server-Sent Events (SSE)
6. The client can reconstruct the journal state from the events

## Benefits of the New Architecture

1. **Clearer Separation of Concerns**: Entities, components, and systems have well-defined responsibilities.

2. **More Flexible Composition**: Entities can be composed of different components without inheritance hierarchies.

3. **Event-Driven Architecture**: Systems respond to events, making the architecture more reactive and easier to extend.

4. **Better Performance**: We only process entities that have relevant components, rather than processing all agents.

5. **Easier Serialization**: The full state of the system can be serialized and deserialized.

6. **More Testable**: Components and systems can be tested in isolation.

## Implementation Plan

1. Create the new Journal class with ECS support
2. Implement the Module interface and initializeJournal function
3. Create the CoreConstructsModule to convert constructs to entities/components/systems
4. Update the HttpApplication to use the new architecture
5. Migrate existing functionality to the new architecture
6. Add tests for the new components

## Conclusion

This new architecture maintains the core requirements of the original system while providing a more flexible, performant, and maintainable implementation. By adopting the Entity-Component-System pattern, we can create a system that is more modular, easier to extend, and better suited for real-time, event-driven applications.