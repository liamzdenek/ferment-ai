# Ferment AI

Ferment AI is a framework and runtime for configuring and executing multi-agent systems. It provides a declarative configuration language where agents, tools, conversations, MCPs, and other components can be configured in a single static configuration file, and then executed.

## Architecture

Ferment AI uses an Entity-Component-System (ECS) architecture inspired by game development but tailored for real-time, event-driven AI systems. This architecture provides several benefits:

- **Clearer Separation of Concerns**: Entities, components, and systems have well-defined responsibilities.
- **More Flexible Composition**: Entities can be composed of different components without inheritance hierarchies.
- **Event-Driven Architecture**: Systems respond to events, making the architecture more reactive and easier to extend.
- **Better Performance**: We only process entities that have relevant components, rather than processing all agents.
- **Easier Serialization**: The full state of the system can be serialized and deserialized.
- **More Testable**: Components and systems can be tested in isolation.

### Core Concepts

- **Journal**: The central "World" that stores all entities, components, systems, and processes.
- **Entity**: A unique identifier with associated components. Agents are entities, and possibly other elements as well.
- **Component**: Pure data objects that store state for an entity. Each entity can have at most one component of each type.
- **System**: Event-based callbacks that respond to journal events and create Processes.
- **Process**: Represents operations like agent calls and tool calls. Has a start invocation and either fails or succeeds with a single result.
- **Module**: A function that takes a RootConstruct, parses the tree, and converts it into entities, components, systems, and processes.
- **Entrypoint**: Defines how to start an execution of a journal.

## Project Structure

Ferment AI is organized into several packages:

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

## Getting Started

### Installation

```bash
git clone <repository-url>
cd ferment
npm install
```

### Building

```bash
npm run build
# Or for specific packages:
npx nx build <package-name>
```

### Running the Demo

```bash
# Run the original demo
npx nx serve demo

# Run the ECS demo
npx nx serve demo:ecs
```

### Using the API

The ECS demo exposes an HTTP API that you can use to execute virtual models:

```bash
# Execute a virtual model
curl -X POST http://localhost:3000/execute -H "Content-Type: application/json" -d '{"entrypointId":"entrypoint","initialState":null}'

# Get the current state of the journal
curl http://localhost:3000/state
```

## Documentation

For more information about the architecture and implementation, see the following documents:

- [ECS Architecture Proposal](memory-bank/ecs-architecture-proposal.md)
- [ECS Implementation Approach](memory-bank/ecs-implementation-approach.md)
- [ECS Migration Guide](memory-bank/ecs-migration-guide.md)

## License

[MIT](LICENSE)
