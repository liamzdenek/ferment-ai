# ECS Implementation Approach

This document outlines the implementation approach for the Entity-Component-System (ECS) architecture, focusing on how each component works and interacts with others.

## Journal Implementation

The Journal class will be the central component of the architecture, responsible for managing entities, components, systems, and processes. Here's how it will work:

### State Management

The Journal will maintain a state object containing:
- A map of entities by ID
- A nested map of components by type and entity ID
- An array of registered systems
- A map of processes by ID
- A set of bound construct IDs
- An array of events

This state will be serializable to allow for persistence and reconstruction.

### Entity Management

- **Entity Creation**: Generates a unique ID and stores a minimal entity object in the entities map
- **Entity Removal**: Removes the entity and all its components from the state
- **Entity Retrieval**: Looks up an entity by ID in the entities map

### Component Management

- **Component Addition**: Stores a component in the components map, indexed by component type and entity ID
- **Component Removal**: Removes a component from the components map
- **Component Retrieval**: Looks up a component by entity ID and component type
- **Entity Query**: Finds all entities that have a specific component type

### System Management

- **System Registration**: Adds a system to the systems array
- **System Execution**: Invokes systems that handle specific event types when events are published

### Process Management

- **Process Creation**: Stores a process in the processes map and publishes a process creation event
- **Process Completion**: Updates a process's status to completed, stores the result, and publishes a process completion event
- **Process Failure**: Updates a process's status to failed, stores the error, and publishes a process failure event

### Event Handling

- **Event Publishing**: Adds an event to the events array and notifies listeners
- **Event Subscription**: Registers a callback to be invoked when events matching a filter are published
- **Event Filtering**: Determines if an event matches a filter based on type, source, and target

### Execution

The execute method will be an async iterable that:
1. Finds the specified entrypoint entity
2. Creates an initial event to trigger the entrypoint
3. Processes events until there are no more active processes
4. Yields each event as it's processed, allowing for real-time streaming

### Serialization

- **Serialization**: Converts the entire state (events, entities, components, systems, processes) to a JSON string
- **Deserialization**: Reconstructs the state from a JSON string

### Construct Binding

- **Marking Constructs**: Adds a construct ID to the boundConstructs set
- **Validation**: Traverses the construct tree and ensures all constructs are in the boundConstructs set

## Entity and Component Implementation

### Entity

Entities will be simple objects with just an ID. All data about an entity will be stored in its components.

### Components

Components will be pure data objects with a type field and additional fields specific to the component type. For example:

- **OpenAIAgentComponent**: Stores model ID, prompt, and parameters
- **SendEmailToolComponent**: Stores the target agent ID
- **EntrypointComponent**: Stores the initial payload for execution

Components will not have methods; instead, functions will operate on component data.

## System Implementation

Systems will be objects with:
- A unique ID
- An array of event types they handle
- An execute method that takes the journal and an event

Systems will query the journal for entities with specific components and create processes as needed. For example:

- **AgentSystem**: Responds to AGENT_INVOKE events, finds the agent entity, and creates a process to invoke the agent
- **ToolSystem**: Responds to TOOL_INVOKE events, finds the tool entity, and creates a process to execute the tool
- **EntrypointSystem**: Responds to ENTRYPOINT_INVOKE events and creates processes to start execution

## Process Implementation

Processes will be objects with:
- A unique ID
- A type (e.g., AgentProcess, ToolProcess)
- A status (created, running, completed, failed)
- Start and end timestamps
- A result object when completed

Processes will be independent with no direct dependencies. They will communicate through journal events.

## Module Implementation

Modules will be objects with:
- A unique ID and version
- An initialize method that takes a RootConstruct and a Journal

The initialize method will:
1. Traverse the construct tree recursively
2. Create entities and components based on the constructs
3. Register systems with the journal
4. Mark constructs as bound

For example, the CoreConstructsModule will:
- Create entities for AgentContext constructs with OpenAIAgent components
- Create entities for Tool constructs with appropriate components
- Create entities for Entrypoint constructs with Entrypoint components
- Register the AgentSystem, ToolSystem, and EntrypointSystem
- Mark all processed constructs as bound

## HttpApplication Implementation

The HttpApplication class will:
- Extend RootConstruct to maintain the construct hierarchy
- Store an array of modules, including the CoreConstructsModule
- Provide an initialize method that creates a journal and initializes it with the modules
- Provide a serve method that creates an Express app and configures routes
- Configure routes for executing the journal and getting its state
- Use Server-Sent Events (SSE) to stream journal events to the client

## Initialization and Execution Flow

1. The HttpApplication is created with modules
2. The initialize method is called, which:
   - Creates a new Journal
   - Initializes each module with the RootConstruct and Journal
   - Validates that all constructs are bound
   - Returns the initialized Journal
3. The serve method is called, which:
   - Creates an Express app
   - Configures middleware and routes
   - Starts the server
4. A client makes a request to the /execute endpoint with an entrypoint ID
5. The server initializes a new Journal with any provided initial state
6. The server calls the Journal's execute method with the entrypoint ID
7. The Journal finds the entrypoint entity and creates an initial event
8. Systems that handle the event type are executed
9. Systems create processes as needed
10. Processes publish events to the Journal when they complete
11. The Journal continues processing events until there are no more active processes
12. Each event is streamed to the client using SSE
13. The client reconstructs the Journal state from the events

## Differences from Current Implementation

The key differences from the current implementation are:

1. **Entity-Component-System Pattern**: The new architecture uses a true ECS pattern, where entities are just identifiers, components are pure data, and systems contain the logic.

2. **Event-Driven Execution**: Systems respond to events rather than being called directly, making the architecture more reactive and easier to extend.

3. **Process-Based Operations**: Agent calls, tool calls, etc. are represented as processes with a clear lifecycle.

4. **Module-Based Initialization**: Constructs are converted to entities, components, and systems by modules during initialization.

5. **Async Iterable Execution**: The Journal's execute method is an async iterable that yields events as they happen, allowing for real-time streaming.

6. **Full State Serialization**: The Journal serializes not just events but also the state of entities, components, systems, and processes.

7. **Construct Binding Validation**: Modules must mark constructs as bound, and the Journal validates that all constructs are bound.

These changes will result in a more flexible, performant, and maintainable architecture that better supports the requirements of the Ferment AI system.