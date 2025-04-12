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
   - Used for tool input/output validation
   - Generates JSON Schema for API documentation
   - Used for workflow and task schema validation

4. **Jest**
   - Testing framework for unit and integration tests
   - Mocking capabilities for testing components in isolation
   - Snapshot testing for configuration validation

### Supporting Technologies

1. **RESTful API**
   - HTTP/HTTPS interface for system interaction
   - Server-Sent Events (SSE) for streaming updates
   - JSON for data serialization

2. **OpenAI API Compatibility Layer**
   - Adapter for compatibility with existing tools
   - Support for standard endpoints and formats

3. **TypeDoc**
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
   - Used for tool input/output validation
   - Used for workflow and task schema validation

3. **zod-to-json-schema** (^3.0.0)
   - Converts Zod schemas to JSON Schema
   - Used for API documentation

4. **express** (^4.0.0)
   - Web framework for Node.js
   - Used for the API server

5. **cors** (^2.0.0)
   - Cross-Origin Resource Sharing middleware
   - Used for API security

6. **body-parser** (^1.0.0)
   - Request body parsing middleware
   - Used for API request handling

7. **uuid** (^9.0.0)
   - UUID generation library
   - Used for creating unique identifiers for tasks and workflows

8. **@ferment-ai/core-constructs-lib**
   - Core construct library
   - Defines the relationship between agents and what they have access to

9. **@ferment-ai/runtime-common**
   - Common interfaces and utilities for runtime packages
   - Defines the Journal interface and related types
   - Contains workflow and task definitions

10. **@ferment-ai/core-constructs-runtime**
    - Runtime implementation for constructs
    - Maps constructs to task functions

11. **@ferment-ai/runtime-in-memory**
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

3. **Concurrency**
   - Multiple workflows may run concurrently
   - Need to manage resource contention
   - Task queuing for complex workflows

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

2. **Node.js Version**
   - Minimum supported version is Node.js 18
   - May use features not available in older versions

## Integration Points

### LLM Providers

1. **OpenAI API**
   - Integration with GPT models
   - Support for streaming responses

2. **Anthropic API**
   - Integration with Claude models
   - Support for tool use

3. **Custom Model Providers**
   - Extensible interface for additional providers
   - Support for self-hosted models

### External Tools

1. **File System**
   - Reading/writing files
   - Directory operations

2. **Command Execution**
   - Running shell commands
   - Process management

3. **Web APIs**
   - HTTP/HTTPS requests
   - Authentication handling

## Architecture

### Workflow Architecture

The system now implements a workflow-based architecture:

1. **Journal**
   - Central executor for workflows
   - Maintains state and provides serialization/deserialization
   - Uses modules to map constructs to task functions
   - Compiles workflows from the construct tree

2. **Workflow**
   - Represents a sequence of tasks with defined relationships
   - Contains an entry point task
   - Can be serialized to a workflow definition
   - Extracted from the construct tree during initialization

3. **Task**
   - Represents a unit of work in a workflow
   - Can call other tasks and return to the caller
   - Can call other tasks and not return (like a directed acyclic graph)
   - Executed by task functions mapped from constructs

4. **Module**
   - Maps constructs to task functions
   - Each module is responsible for a specific type of construct
   - Allows for extensibility through additional modules

5. **Compiler**
   - Extracts workflows from the construct tree
   - Finds workflow constructs and their tasks
   - Creates workflows from entrypoints if no workflow constructs are found

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

## Demo Application

A demo application has been created in 'packages/demo/src/main.ts' that shows how the app will be initialized and navigated. It demonstrates a two-agent model with a junior engineer and senior engineer that can communicate with each other.

To build and run the demo application:

```bash
# Build the demo application
npx nx build demo

# Run the demo application
npx nx serve demo
```

The demo application showcases:
1. Creating a VirtualModel
2. Setting up agent contexts with different models
3. Creating workflow tasks for agents
4. Defining task relationships
5. Creating a workflow with an entry point task
6. Using the Journal to execute the workflow