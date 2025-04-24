# Active Context: Ferment AI

## Current Focus

We are implementing a workflow-based architecture for the Ferment AI system with a major refactoring of the TaskFunction to be an async generator/AsyncIterable function. This architecture allows for defining workflows as sequences of tasks with clear relationships, enabling modular and composable model systems with improved suspension and resumption capabilities.

Our current focus is on implementing advanced workflow components including **StructuredOutput** for type-safe data extraction, **LLMGate** for conditional workflow execution, and **Chain** for sequential task execution. We've also enhanced the **Model Context Protocol (MCP)** integration, allowing connection to external capability servers, and refined the **CapableModel** architecture that combines models with capabilities, enabling tool use in LLM interactions.

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

7. **StructuredOutput Implementation**: We've implemented a StructuredOutput capability that enables type-safe data extraction from LLM responses using Zod schemas.

8. **LLMGate Implementation**: We've created an LLMGate component that leverages StructuredOutput to enable conditional workflow execution based on LLM outputs.

9. **Chain Implementation**: We've implemented a Chain component that allows linking multiple workflow tasks together in sequence.

10. **Workflow Exception Throwing**: We've enhanced error handling in workflows with improved error messages and propagation.

## Active Considerations

1. **Journal Implementation**: The Journal class is responsible for executing workflows and maintaining state. It uses modules to map constructs to task implementations and a compiler to extract workflows from the construct tree.

2. **Workflow and Task Design**: Workflows are composed of tasks with defined relationships. Tasks can call other tasks and return to the caller, or they can call other tasks and not return (like a directed acyclic graph).

3. **Module Interface**: Modules map constructs to task implementations, allowing for extensibility. Each module is responsible for a specific type of construct, such as models, capabilities, or capability parsers.

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

1. **StructuredOutput Implementation**:
   - Finalizing StructuredOutput capability for type-safe data extraction
   - Implementing Zod schema validation for structured outputs
   - Creating test cases for StructuredOutput usage
   - Integrating StructuredOutput with other components

2. **LLMGate Implementation**:
   - Refining LLMGate component for conditional workflow execution
   - Implementing regex-based and range-based conditions
   - Creating test cases for LLMGate usage
   - Integrating LLMGate with Chain and other components

3. **Chain Implementation**:
   - Optimizing Chain component for sequential task execution
   - Implementing link management and execution
   - Creating test cases for Chain usage
   - Integrating Chain with other workflow components

4. **Model Context Protocol Integration**:
   - Refining MCPCapability implementation
   - Improving capability discovery and execution
   - Enhancing error handling for external MCP servers
   - Implementing Dad Joke MCP server for testing

5. **Template Parser Implementation**:
   - Moving prompts to separate files for better organization
   - Refining BaseTemplateParser and DotTemplateParser implementations
   - Improving template parsing for capability parsers
   - Enhancing prompt formatting and variable substitution

6. **Workflow Execution**:
   - Enhancing workflow executor to handle both promise and generator patterns
   - Improving support for task relationships and capability calls
   - Implementing workflow exception throwing and handling
   - Ensuring proper event generation during execution

7. **State Management**:
   - Refining serialization and deserialization of the journal state
   - Ensuring proper state propagation between tasks
   - Handling task suspension and resumption state

## Next Steps

1. **Enhance Workflow Components**:
   - Extend LLMGate with additional condition types
   - Improve Chain with branching and parallel execution
   - Create more specialized workflow components for common patterns
   - Develop composition patterns for complex workflows

2. **Implement Real Model Execution**:
   - Connect task implementations to additional LLM API calls (OpenAI, Anthropic)
   - Implement proper handling of model responses
   - Add support for streaming responses from models

3. **Enhance Capability System**:
   - Improve capability execution logic
   - Enhance capability parameters validation
   - Implement prompt chaining for complex workflows
   - Create more MCP server implementations

4. **Add Support for More Task Types**:
   - Create specialized task types for common operations
   - Implement task composition for complex workflows
   - Develop a library of reusable tasks

5. **Implement System for Managing Task Relationships**:
   - Create a relationship registry in the Journal
   - Add methods for querying related tasks
   - Implement visualization tools for task relationships

6. **Add Serialization Optimizations**:
   - Implement compression for large journal states
   - Add support for partial serialization (only changed state)
   - Create a more efficient format for serialization

7. **Improve Error Handling and Recovery**:
   - Extend workflow exception throwing and handling
   - Implement recovery mechanisms for failed tasks
   - Create a transaction-like system for atomic operations

8. **Add Monitoring and Debugging Tools**:
   - Implement a visualization tool for workflows
   - Add metrics collection for performance analysis
   - Create a debugging interface for inspecting tasks and their state

## Open Questions

1. **Task Granularity**: How fine-grained should our tasks be? Should we have a single task for a model, or should we break it down into smaller tasks?

2. **Task Relationships**: What's the best way to represent complex task relationships? Should we have more advanced constructs like conditional execution or loops?

3. **State Management**: How should we handle state that needs to be shared between tasks? Should we have a global state, or should we pass state explicitly between tasks?

4. **Serialization Format**: What's the most efficient format for serializing the journal state? Should we use JSON, a binary format, or something else?

5. **Performance Optimization**: How can we optimize the performance of the system, especially for large workflows with many tasks?

6. **Error Handling**: How should we handle errors in task execution? Should we have retry mechanisms, fallback tasks, or other error recovery strategies?

7. **Workflow Versioning**: How should we handle changes to workflow definitions over time? Should we version workflows, or should we have a more flexible approach?

8. **Capability Naming Conflicts**: How should we handle naming conflicts when multiple capabilities have the same name? Currently, we use the latest definition, but is there a better approach?

9. **Prompt Chaining**: How should we implement prompt chaining for complex workflows? Should we have a dedicated component for this, or should it be part of the CapableModel?

10. **AgentContext Deprecation**: How should we handle the transition from AgentContext to CapableModel? Should we provide migration tools or documentation?

## Commands

To build and run the demo application:

```bash
# Build the demo application
npx nx build demo

# Run the demo application with a specific test case
npx nx serve demo --args="SimpleCall"
npx nx serve demo --args="TestMCPGetCapabilities"
npx nx serve demo --args="TestMCPExecuteCapability"
npx nx serve demo --args="TestCapableModel"
npx nx serve demo --args="TestDotTemplateParser"
npx nx serve demo --args="TestStructuredOutput"
npx nx serve demo --args="TestLLMGate"
npx nx serve demo --args="TestChain"
