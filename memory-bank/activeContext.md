# Active Context: Ferment AI

## Current Focus

We are in the initial planning and architecture phase of the Ferment AI project. The primary focus is on:

1. **Defining the Core Architecture**: Establishing the foundational patterns and components that will form the basis of the system.

2. **Designing the Configuration API**: Creating a clean, intuitive API using the AWS CDK constructs library for defining multi-agent systems.

3. **Planning the Journal System**: Designing the central journal that will serve as the source of truth for the entire system.

4. **Establishing Component Interfaces**: Defining clear interfaces between system components to ensure proper separation of concerns.

## Recent Decisions

1. **Using AWS CDK Constructs Library**: We've decided to use the actual "constructs" npm package from AWS CDK, not just a CDK-like approach, as the foundation for our configuration system.

2. **Journal-Centric Architecture**: The journal will be the source of truth for the entire system state, containing all data needed to reconstruct agent contexts and continue execution.

3. **Stateless API Design**: The system will have no persistence and will rely on a stateless API, where the end user stores the entire journal and passes it to the API to resume a paused/canceled prompt.

4. **Real-Time Visibility**: All agent interactions and processing should be visible to the end user in real-time.

5. **Error Handling Approach**: Errors should be captured in the journal and surfaced to the agent that invoked the tool, allowing the agent to handle the error.

## Active Considerations

1. **Journal Structure and Efficiency**:
   - How to structure the journal for efficient serialization/deserialization
   - How to handle large journals with many events
   - How to filter events for specific views or contexts

2. **Tool System Design**:
   - How to implement the tool registration and discovery system
   - How to handle tool execution and error reporting
   - How to standardize tool input/output formats

3. **Agent Context Management**:
   - How to efficiently reconstruct agent context from journal events
   - How to handle context window limitations
   - How to manage multiple concurrent agent contexts

4. **API Design**:
   - How to structure the API for both ease of use and flexibility
   - How to handle streaming updates efficiently
   - How to implement the OpenAI compatibility layer

5. **Testing Strategy**:
   - How to test the configuration system
   - How to test agent interactions
   - How to mock LLM responses for deterministic testing

## Next Steps

1. **Define Core Interfaces**:
   - Create interface definitions for key components (Construct, VirtualModel, AgentContext, Tool, etc.)
   - Define the journal event structure and operations
   - Establish the messaging protocol between components

2. **Implement Basic Construct System**:
   - Create the base Construct class
   - Implement the core L1 constructs
   - Develop the configuration validation system

3. **Develop Journal System Prototype**:
   - Implement the basic journal structure
   - Create the event publishing and subscription mechanisms
   - Develop serialization/deserialization functionality

4. **Create Simple Agent Context**:
   - Implement basic agent context reconstruction from journal events
   - Develop prompt construction and LLM invocation
   - Create tool registration and invocation mechanisms

5. **Build Prototype Tool Implementation**:
   - Implement the base Tool class with Zod schema validation
   - Create a few simple tools for testing
   - Develop the tool execution and error handling system

6. **Develop Basic API Endpoints**:
   - Create endpoints for system interaction
   - Implement streaming support for real-time updates
   - Develop journal-based state management

## Open Questions

1. How should we handle versioning of the configuration language?

2. What's the best approach for managing context windows with large journals?

3. How should we implement the messaging system between agents?

4. What's the most efficient way to serialize/deserialize the journal?

5. How should we handle tool timeouts and cancellation?

6. What's the best approach for testing complex agent interactions?

7. How should we document the configuration API for developers?

8. What metrics should we collect to monitor system performance?