# Technical Context: Ferment AI

## Technology Stack

### Core Technologies

1. **TypeScript/Node.js**
   - Primary implementation language
   - Strong typing for better developer experience
   - Large ecosystem of libraries and tools

2. **AWS CDK Constructs Library**
   - Foundation for the declarative configuration system
   - Provides patterns for composable, hierarchical components
   - Well-established in the industry

3. **Zod**
   - Schema validation for runtime type safety
   - Used for capability input/output validation
   - Generates JSON Schema for API documentation
   - Used for workflow and task schema validation
   - Validates inputs and outputs between task calls

4. **Jest**
   - Testing framework for unit and integration tests
   - Mocking capabilities for testing components in isolation
   - Snapshot testing for configuration validation

### Supporting Technologies

1. **RESTful API**
   - HTTP/HTTPS interface for system interaction
   - Server-Sent Events (SSE) for streaming updates
   - JSON for data serialization

2. **Model Context Protocol (MCP)**
   - Protocol for connecting to external capability servers
   - Support for tools, prompts, and resources
   - HTTP and stdio transport options
   - Standardized capability discovery and execution

3. **Dot Template Engine**
   - Used for prompt formatting with available capabilities
   - Supports dynamic template generation

4. **TypeDoc**
   - Documentation generation from TypeScript code
   - API reference for developers

## Development Environment

### Required Tools

1. **Node.js** (v18+)
   - Runtime environment for JavaScript
   - npm for package management

2. **TypeScript** (v5+)
   - Typed superset of JavaScript
   - Compiler for type checking and transpilation

3. **Git**
   - Version control system
   - Branch management for feature development

4. **VS Code** (recommended)
   - IDE with strong TypeScript support
   - Extensions for testing and debugging

### Development Workflow

1. **Setup**
   ```bash
   git clone <repository-url>
   cd ferment
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   # Or for specific packages:
   npx nx build <package-name>
   ```

3. **Test**
   ```bash
   npm test
   # Or for specific packages:
   npx nx test <package-name>
   ```

4. **Run**
   ```bash
   npm start
   # Or for the demo application:
   npx nx serve demo
   ```

5. **Development Mode**
   ```bash
   npm run dev
   # Or for the demo application:
   npx nx serve demo
   ```

## Dependencies

### Production Dependencies

1. **constructs** (^10.0.0)
   - AWS CDK constructs library
   - Core foundation for the configuration system

2. **zod** (^3.0.0)
   - Schema validation library
   - Used for capability input/output validation
   - Used for workflow and task schema validation
   - Validates inputs and outputs between task calls

3. **zod-to-json-schema** (^3.0.0)
   - Converts Zod schemas to JSON Schema
   - Used for API documentation

4. **@modelcontextprotocol/sdk**
   - SDK for the Model Context Protocol
   - Provides client for connecting to MCP servers
   - Supports HTTP and stdio transports

5. **dot**
   - Template engine for prompt formatting
   - Used by TagCapabilityParser for formatting prompts with available capabilities

6. **express** (^4.0.0)
   - Web framework for Node.js
   - Used for the API server

7. **cors** (^2.0.0)
   - Cross-Origin Resource Sharing middleware
   - Used for API security

8. **body-parser** (^1.0.0)
   - Request body parsing middleware
   - Used for API request handling

9. **uuid** (^9.0.0)
   - UUID generation library
   - Used for creating unique identifiers for tasks and workflows

10. **@ferment-ai/core-constructs-lib**
    - Core construct library
    - Defines the relationship between components and what they have access to
    - Contains task definitions
    - Includes WorkflowTask, BaseModel, BaseCapability, and BaseCapabilityParser

11. **@ferment-ai/runtime-common**
   - Common interfaces and utilities for runtime packages
   - Defines the Journal interface and related types
   - Contains workflow and task interfaces
   - Defines TaskImpl interface and related types

12. **@ferment-ai/core-constructs-runtime**
    - Runtime implementation for constructs
    - Maps constructs to task implementations
    - Implements task execution functions

13. **@ferment-ai/runtime-in-memory**
    - In-memory implementation of the Journal
    - Executes workflows and maintains state

### Development Dependencies

1. **typescript** (^5.0.0)
   - TypeScript compiler and language services

2. **jest** (^29.0.0)
   - Testing framework

3. **ts-jest** (^29.0.0)
   - TypeScript support for Jest

4. **@types/node** (^18.0.0)
   - TypeScript definitions for Node.js

5. **@types/jest** (^29.0.0)
   - TypeScript definitions for Jest

6. **eslint** (^8.0.0)
   - Linting tool for code quality

7. **prettier** (^3.0.0)
   - Code formatting tool

## Technical Constraints

### Performance Constraints

1. **Memory Usage**
   - Journal state may grow large for complex workflows
   - Need to implement efficient serialization/deserialization
   - Consider compression for large journal states

2. **Latency**
   - Real-time streaming requires low-latency processing
   - Tool execution may introduce variable latency
   - Task execution should be optimized
   - Task suspension and resumption adds complexity

3. **Concurrency**
   - Multiple workflows may run concurrently
   - Need to manage resource contention
   - Task queuing for complex workflows
   - Async generators may introduce concurrency challenges

### Security Constraints

1. **Tool Execution**
   - Tools have full access to the system
   - No sandboxing in the initial implementation
   - Potential security risks from malicious tools

2. **API Security**
   - Need to implement authentication/authorization
   - Protect against common web vulnerabilities
   - Validate workflow and task definitions

### Compatibility Constraints

1. **Browser Support**
   - Client-side components should work in modern browsers
   - May need polyfills for older browsers
   - Async generators require modern JavaScript engines

2. **Node.js Version**
   - Minimum supported version is Node.js 18
   - May use features not available in older versions
   - Async generators require Node.js 10+

## Integration Points

### LLM Providers

1. **Ollama API**
   - Integration with open-source models
   - Support for local model hosting
   - Low-latency inference

2. **OpenAI API**
   - Integration with GPT models
   - Support for streaming responses
   - Support for tool use

3. **Anthropic API**
   - Integration with Claude models
   - Support for tool use

4. **Custom Model Providers**
   - Extensible interface for additional providers
   - Support for self-hosted models

### External Capabilities

1. **MCP Capabilities**
   - Tools: Functions that can be called by models
   - Prompts: Pre-defined prompts that can be used by models
   - Resources: Data sources that can be accessed by models

2. **File System**
   - Reading/writing files
   - Directory operations

3. **Command Execution**
   - Running shell commands
   - Process management

4. **Web APIs**
   - HTTP/HTTPS requests
   - Authentication handling

## Architecture

### Workflow Architecture

The system now implements a workflow-based architecture with async generator task functions:

1. **Journal**
   - Central executor for workflows
   - Maintains state and provides serialization/deserialization
   - Uses modules to map constructs to task implementations
   - Stores the complete CompileWorkflowsResult
   - Compiles workflows from the construct tree

2. **Workflow**
   - Represents a sequence of tasks with defined relationships
   - Contains an entry point task
   - Uses full paths for task IDs in the tasks map and entryPoints map
   - Can be serialized to a workflow definition
   - Extracted from the construct tree during initialization

3. **Task**
   - Represents a unit of work in a workflow
   - Can call other tasks and return to the caller (canCallAndReturn)
   - Can call other tasks and not return (canCall)
   - Referenced by full path to ensure global uniqueness
   - Executed by task implementations mapped from constructs

4. **Module**
   - Maps constructs to task implementations
   - Each module is responsible for a specific type of construct
   - Provides task implementations for models, capabilities, and capability parsers
   - Allows for extensibility through additional modules

5. **Compiler**
   - Extracts workflows from the construct tree
   - Finds workflow constructs and their tasks
   - Uses full paths for task implementations instead of just IDs
   - Properly handles both calling patterns (canCallAndReturn and canCall)
   - Creates workflows from entrypoints if no workflow constructs are found

6. **Task Implementation**
   - Implements the TaskImpl interface
   - Includes task definition, task ID, and execute function
   - Execute function can be either an async generator or a promise
   - Async generators can yield control to other tasks and resume execution
   - Promises are used for simple tasks that don't need to call other tasks

7. **Task Definition**
   - Implements the TaskDef interface
   - Includes task definition ID, input type, and output type
   - Located in the core-constructs-lib package
   - Separated from task implementation for better organization

8. **Task Message Types**
   - TaskCallRequest: A request to call another task
   - TaskCallResult: A result from a task call
   - TaskCallAndReturnRequest: A request to call another task and return to the caller
   - All message types are serializable as JSON

### Package Structure

The system is organized into several packages:

1. **core-constructs-lib**
   - Contains core constructs and task definitions
   - Defines WorkflowTask, BaseModel, BaseCapability, and BaseCapabilityParser
   - Includes CapableModel, MCPCapability, and TagCapabilityParser
   - Defines the relationship between components and what they have access to
   - Does not contain runtime implementation

2. **runtime-common**
   - Contains common interfaces and utilities
   - Defines the Journal interface and related types
   - Contains workflow and task interfaces
   - Defines TaskImpl interface and related types

3. **core-constructs-runtime**
   - Contains runtime implementation for constructs
   - Maps constructs to task implementations
   - Implements task execution functions

4. **runtime-in-memory**
   - Contains in-memory implementation of the Journal
   - Executes workflows and maintains state

5. **runtime-http**
   - Contains HTTP server implementation
   - Provides API for executing workflows

6. **demo**
   - Contains demo application
   - Shows how to use the system

## Deployment Considerations

### Local Development

1. **Development Server**
   - Express server for API
   - Hot reloading for rapid development
   - Run with `npx nx serve demo`

2. **Testing Environment**
   - Mock LLMs for deterministic testing
   - Simulated tool execution
   - Unit tests for workflows and tasks

### Production Deployment

1. **Containerization**
   - Docker for consistent environments
   - Docker Compose for local testing

2. **Cloud Deployment**
   - Node.js hosting platforms
   - Serverless options for scaling

3. **Monitoring**
   - Logging for debugging
   - Metrics for performance monitoring
   - Event tracking for workflow execution

## Demo Applications

Several demo applications have been created to showcase different aspects of the system:

### Main Demo

A demo application has been created in 'packages/demo/src/main.ts' that shows how the app will be initialized and navigated. It includes several test cases demonstrating different aspects of the system.

To build and run the demo application:

```bash
# Build the demo application
npx nx build demo

# Run the demo application with a specific test case
npx nx serve demo --args="SimpleCall"
npx nx serve demo --args="TestMCPGetCapabilities"
npx nx serve demo --args="TestMCPExecuteCapability"
npx nx serve demo --args="TestCapableModel"
```

The demo applications showcase:
1. **SimpleCall**: Basic workflow execution with task calls
2. **TestMCPGetCapabilities**: Discovering capabilities from MCP servers
3. **TestMCPExecuteCapability**: Executing capabilities from MCP servers
4. **TestCapableModel**: Using CapableModel to combine models with capabilities
