# Active Context: Ferment AI

## Current Focus

We are implementing a workflow-based architecture for the Ferment AI system with a major refactoring of the TaskFunction to be an async generator/AsyncIterable function. This architecture allows for defining workflows as sequences of tasks with clear relationships, enabling modular and composable agent systems with improved suspension and resumption capabilities.

1. **Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment-ai/core-constructs-lib`: Core construct library and task definitions
   - `@ferment-ai/runtime-common`: Common interfaces and utilities for runtime packages
   - `@ferment-ai/runtime-in-memory`: In-memory implementation of the Journal
   - `@ferment-ai/core-constructs-runtime`: Runtime implementation for constructs
   - `@ferment-ai/runtime-http`: HTTP server implementation
   - `@ferment-ai/demo`: Demo application

2. **Workflow Architecture Design**: We have designed a new architecture based on workflows and tasks:
   - **Journal**: The central executor that runs workflows and maintains state
   - **Workflow**: A sequence of tasks with defined relationships
   - **Task**: A unit of work in a workflow
   - **Module**: A function that maps constructs to task implementations
   - **Compiler**: A function that extracts workflows from the construct tree

3. **Implementation Approach**: We have created a detailed implementation of the new architecture:
   - `Workflow` class: Represents a sequence of tasks
   - `Task` class: Represents a unit of work in a workflow
   - `Journal` class: Executes workflows and maintains state
   - `Module` interface: Maps constructs to task implementations
   - `compileWorkflows` function: Extracts workflows from the construct tree

## Recent Decisions

1. **Async Generator TaskFunction**: We've refactored TaskFunction to be an async generator/AsyncIterable function, enabling suspension and resumption of tasks.

2. **Task Definitions in core-constructs-lib**: Task definitions are now located in the core-constructs-lib package, while task implementations remain in core-constructs-runtime.

3. **Zod Type Validation**: We've implemented Zod validation for inputs and outputs between task calls, ensuring type safety at runtime.

4. **Support for Both Promise and Generator Patterns**: The system now supports both promise-based task functions (for simple tasks) and generator-based task functions (for complex tasks that need to call other tasks).

5. **TaskImpl Interface**: We've created a new TaskImpl interface that includes the task definition, task ID, and execute function.

6. **Serializable Task Messages**: All task messages (TaskCallRequest, TaskCallResult, TaskCallAndReturnRequest) are designed to be serializable as JSON.

## Active Considerations

1. **Journal Implementation**: The Journal class is responsible for executing workflows and maintaining state. It uses modules to map constructs to task implementations and a compiler to extract workflows from the construct tree.

2. **Workflow and Task Design**: Workflows are composed of tasks with defined relationships. Tasks can call other tasks and return to the caller, or they can call other tasks and not return (like a directed acyclic graph).

3. **Module Interface**: Modules map constructs to task implementations, allowing for extensibility. Each module is responsible for a specific type of construct, such as agents, models, or tools.

4. **Compiler Implementation**: The compiler extracts workflows from the construct tree by finding workflow constructs and their tasks, or by creating workflows from entrypoints if no workflow constructs are found.

5. **Task Execution Flow**: The system now supports both promise-based and generator-based task execution, with proper handling of task suspension and resumption.

## Recent Changes

1. **Refactored TaskFunction to Async Generator**:
   - Updated TaskFunction to be an async generator/AsyncIterable function
   - Added support for yielding control to other tasks and resuming execution
   - Implemented proper type validation between calls using Zod

2. **Moved Task Definitions to core-constructs-lib**:
   - Created a new task-defs.ts file in core-constructs-lib
   - Moved all task definitions from runtime to lib package
   - Updated imports in core-constructs-runtime to use the new definitions

3. **Enhanced Task Implementation**:
   - Created TaskImpl interface with def, taskId, and execute properties
   - Implemented both promise-based and generator-based task functions
   - Added support for task suspension and resumption

4. **Updated Supporting Files**:
   - Modified compiler.ts to use TaskImplMap instead of TaskFunctionMap
   - Updated journal.ts to use the new interfaces
   - Ensured all files are compatible with the new architecture

## Current Implementation Focus

1. **Task Implementation Enhancement**:
   - Refining task implementations for different construct types
   - Ensuring proper error handling and result propagation
   - Optimizing task execution flow

2. **Workflow Execution**:
   - Enhancing workflow executor to handle both promise and generator patterns
   - Improving support for task relationships and tool calls
   - Ensuring proper event generation during execution

3. **State Management**:
   - Refining serialization and deserialization of the journal state
   - Ensuring proper state propagation between tasks
   - Handling task suspension and resumption state

## Next Steps

1. **Implement Real Agent Execution**:
   - Connect task implementations to actual LLM API calls
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
