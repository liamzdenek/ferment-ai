# Active Context: Ferment AI

## Current Focus

We have made significant progress in implementing the core constructs for the Ferment AI system:

1. **Implemented Core Constructs**: We have created the base constructs for the system, including:
   - `FermentConstruct`: Base class for all Ferment constructs
   - `VirtualModel`: Top-level container for agent systems
   - `AgentContext`: Environment for a single agent
   - `Model` (with `OpenAIModel` and `AnthropicModel`): LLM provider interfaces
   - `Tool` (with `FileTool` and `CommandTool`): Tool interfaces
   - `Entrypoint` and `ExitPoint`: Starting and ending points for a virtual model

2. **Set Up Project Structure**: We have set up an Nx monorepo with the following packages:
   - `@ferment/constructs`: Core construct library
   - `@ferment/runtime`: Runtime implementation
   - `@ferment/journal`: Journal system
   - `@ferment/api`: API layer
   - `@ferment/tools`: Tool implementations
   - `@ferment/models`: Model integrations
   - `@ferment/testing`: Testing utilities

3. **Configured TypeScript**: We have configured TypeScript for the project, including module resolution and other compiler options.

## Recent Decisions

1. **Using AWS CDK Constructs Library**: We're using the actual "constructs" npm package from AWS CDK as the foundation for our configuration system.

2. **Journal-Centric Architecture**: The journal will be the source of truth for the entire system state, containing all data needed to reconstruct agent contexts and continue execution.

3. **Stateless API Design**: The system will have no persistence and will rely on a stateless API, where the end user stores the entire journal and passes it to the API to resume a paused/canceled prompt.

4. **Package Structure**: We've organized the codebase into multiple packages to maintain separation of concerns and enable modular development.

5. **Tool Implementation with Zod**: We're using Zod for schema validation in our tools, which provides runtime type safety and clear error messages.

## Active Considerations

1. **Jest Configuration Issues**: We're currently experiencing issues with the Jest plugin in the Nx configuration. This needs to be resolved to enable proper testing.

2. **Demo Application**: We need to create a demo application that showcases the usage of our constructs in a real-world scenario.

3. **Journal Implementation**: We need to implement the journal system, which is the core of our architecture.

4. **Runtime Implementation**: We need to implement the runtime system that will execute the constructs.

5. **API Implementation**: We need to implement the API layer that will expose the system to external clients.

## Next Steps

1. **Fix Jest Configuration**: Resolve the issues with the Jest plugin to enable proper testing.

2. **Create Demo Application**: Create a demo application that showcases the usage of our constructs.

3. **Implement Journal System**: Implement the core journal system with event publishing and subscription.

4. **Implement Runtime System**: Implement the runtime system that will execute the constructs.

5. **Implement API Layer**: Implement the API layer that will expose the system to external clients.

## Open Questions

1. How should we handle the Jest configuration issues?

2. What's the best approach for creating a demo application that showcases our constructs?

3. How should we implement the journal system to ensure efficient serialization/deserialization?

4. How should we handle context window limitations in the runtime system?

5. What's the best approach for implementing the API layer to ensure compatibility with different clients?