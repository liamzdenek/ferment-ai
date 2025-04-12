# Active Context: Ferment AI

## Current Focus

We are implementing a workflow-based architecture for the Ferment AI system. This architecture allows for defining workflows as sequences of tasks with clear relationships, enabling modular and composable agent systems.

1. **Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library
   - `@ferment-ai/runtime-common`: Common interfaces and utilities for runtime packages
   - `@ferment-ai/runtime-in-memory`: In-memory implementation of the Journal
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs
   - `@ferment-ai/runtime-http`: HTTP server implementation
   - `@ferment-ai/demo`: Demo application

2. **Workflow Architecture Design**: We have designed a new architecture based on workflows and tasks:
   - **Journal**: The central executor that runs workflows and maintains state
   - **Workflow**: A sequence of tasks with defined relationships
   - **Task**: A unit of work in a workflow
   - **Module**: A function that maps constructs to task functions
   - **Compiler**: A function that extracts workflows from the construct tree

3. **Implementation Approach**: We have created a detailed implementation of the new architecture:
   - `Workflow` class: Represents a sequence of tasks
   - `Task` class: Represents a unit of work in a workflow
   - `Journal` class: Executes workflows and maintains state
   - `Module` interface: Maps constructs to task functions
   - `compileWorkflows` function: Extracts workflows from the construct tree

## Recent Decisions

1. **Workflow-Based Architecture**: We've decided to adopt a workflow-based architecture where workflows are composed of tasks with defined relationships.

2. **Journal as Central Executor**: The Journal will now be the central executor for workflows, maintaining state and providing serialization/deserialization.

3. **Task-Based Execution**: Agent calls, tool calls, etc. will be represented as tasks with defined relationships, allowing for better tracking and management of operations.

4. **Module-Based Mapping**: Constructs will be mapped to task functions by modules, allowing for modular and extensible system configuration.

5. **Async Iterable Execution**: The Journal's executeWorkflow method will be an async iterable that yields events as they happen, allowing for real-time streaming.

6. **Full State Serialization**: The Journal will serialize its state, including workflows and task functions, allowing for stateful execution.

7. **Construct Tree Compilation**: The system will extract workflows from the construct tree during initialization, allowing for declarative workflow definition.

## Active Considerations

1. **Journal Implementation**: The Journal class is responsible for executing workflows and maintaining state. It uses modules to map constructs to task functions and a compiler to extract workflows from the construct tree.

2. **Workflow and Task Design**: Workflows are composed of tasks with defined relationships. Tasks can call other tasks and return to the caller, or they can call other tasks and not return (like a directed acyclic graph).

3. **Module Interface**: Modules map constructs to task functions, allowing for extensibility. Each module is responsible for a specific type of construct, such as agents, models, or tools.

4. **Compiler Implementation**: The compiler extracts workflows from the construct tree by finding workflow constructs and their tasks, or by creating workflows from entrypoints if no workflow constructs are found.

5. **HttpApplication Integration**: The HttpApplication class will use the new Journal implementation, providing an API for executing workflows and getting their state.

## Recent Changes

1. **Implemented Workflow and Task Classes**:
   - Created the Workflow class to represent a sequence of tasks
   - Created the Task class to represent a unit of work in a workflow
   - Added methods for defining task relationships (canCall, canCallAndReturn)
   - Implemented serialization of workflows to workflow definitions

2. **Implemented Journal Class**:
   - Created the Journal class to execute workflows and maintain state
   - Added methods for executing workflows and serializing/deserializing state
   - Implemented module-based initialization

3. **Implemented Module Interface**:
   - Created the Module interface for mapping constructs to task functions
   - Implemented the core-constructs-runtime module for mapping core constructs

4. **Implemented Compiler**:
   - Created the compileWorkflows function to extract workflows from the construct tree
   - Added support for finding workflow constructs and their tasks
   - Implemented fallback to create workflows from entrypoints

5. **Updated AgentContext Class**:
   - Added the newPromptTask method to create workflow tasks for agents
   - Implemented the sendEmailTool method to create communication tools

## Current Implementation Focus

1. **Task Function Implementation**:
   - Implementing task functions for different construct types
   - Adding support for agent execution, tool execution, etc.
   - Ensuring proper error handling and result propagation

2. **Workflow Execution**:
   - Implementing the workflow executor to run tasks in the correct order
   - Adding support for task relationships and tool calls
   - Ensuring proper event generation during execution

3. **State Management**:
   - Implementing serialization and deserialization of the journal state
   - Adding support for saving and loading workflows
   - Ensuring proper state propagation between tasks

## Next Steps

1. **Implement Real Agent Execution**:
   - Connect task functions to actual LLM API calls
   - Implement proper handling of agent responses
   - Add support for streaming responses from agents

2. **Enhance Tool System**:
   - Implement actual tool execution logic
   - Add support for tool parameters validation
   - Create a mechanism for tools to return results to agents

3. **Add Support for More Task Types**:
   - Create specialized task types for common operations
   - Implement task composition for complex workflows
   - Develop a library of reusable tasks

4. **Implement System for Managing Task Relationships**:
   - Create a relationship registry in the Journal
   - Add methods for querying related tasks
   - Implement visualization tools for task relationships

5. **Add Serialization Optimizations**:
   - Implement compression for large journal states
   - Add support for partial serialization (only changed state)
   - Create a more efficient format for serialization

6. **Improve Error Handling and Recovery**:
   - Add more robust error handling in task functions
   - Implement recovery mechanisms for failed tasks
   - Create a transaction-like system for atomic operations

7. **Add Monitoring and Debugging Tools**:
   - Implement a visualization tool for workflows
   - Add metrics collection for performance analysis
   - Create a debugging interface for inspecting tasks and their state

8. **Extend Module System**:
   - Add support for module dependencies and loading order
   - Implement a plugin system for third-party modules
   - Create a registry for discovering available modules

## Open Questions

1. **Task Granularity**: How fine-grained should our tasks be? Should we have a single task for an agent, or should we break it down into smaller tasks?

2. **Task Relationships**: What's the best way to represent complex task relationships? Should we have more advanced constructs like conditional execution or loops?

3. **State Management**: How should we handle state that needs to be shared between tasks? Should we have a global state, or should we pass state explicitly between tasks?

4. **Serialization Format**: What's the most efficient format for serializing the journal state? Should we use JSON, a binary format, or something else?

5. **Performance Optimization**: How can we optimize the performance of the system, especially for large workflows with many tasks?

6. **Error Handling**: How should we handle errors in task execution? Should we have retry mechanisms, fallback tasks, or other error recovery strategies?

7. **Workflow Versioning**: How should we handle changes to workflow definitions over time? Should we version workflows, or should we have a more flexible approach?

## Commands

To build and run the demo application:

```bash
npx nx build demo
npx nx serve demo
