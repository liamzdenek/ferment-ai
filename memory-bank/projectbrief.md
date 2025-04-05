# Project Brief: Ferment AI

## Project Overview
Ferment AI is a framework and runtime for configuring and executing multi-agent systems. It provides a declarative configuration language where agents, tools, conversations, MCPs, and other components can be configured in a single static configuration file, and then executed.

## Core Requirements

1. **Declarative Configuration**
   - Use the actual "constructs" npm package from AWS CDK
   - Support a hierarchy of constructs (L1, L2, L3)
   - Allow users to define custom constructs at all levels

2. **Real-Time Streaming**
   - Support real-time streaming of tokens to end users
   - Make all agent interactions and processing visible to end users
   - No streaming between agents (they wait until other agents finish)

3. **Status Information**
   - Surface status information about which agent is running what
   - Provide ability to see each context separately

4. **Journal System**
   - Maintain a central journal of all processes (tools, agent invocations, etc.)
   - Journal is the authoritative source of data for everything
   - Agent contexts derive their context from this journal
   - Journal operates on a pub-sub model
   - Journal is append-only during execution

5. **Stateless Operation**
   - System has no persistence
   - Relies on a stateless API
   - End user stores the entire journal
   - Journal is passed to API to resume paused/canceled prompts

6. **Tool System**
   - Tools publish results to central message journal
   - Tool errors surfaced to the agent that invoked the tool
   - Tools have access to full execution context
   - No runtime sandboxing for tools

7. **Messaging System**
   - Messages are generic events in the journal
   - Asynchronous delivery (no cancellation of in-flight operations)
   - Support for inter-agent communication

8. **Human Intervention**
   - Allow humans to cancel processes at any point
   - Return current state of journal when canceled
   - Support resuming from any point with journal state

## Project Goals

1. Create a flexible, extensible framework for multi-agent systems
2. Provide a superior developer experience compared to existing solutions like LangChain
3. Enable complex agent interactions through declarative configuration
4. Support real-time visibility into agent operations
5. Allow for human oversight and intervention
6. Maintain a clean separation between configuration and runtime

## Non-Goals

1. Server-side persistence of state
2. Complex sandboxing of tool execution
3. Optimizing for extreme scalability initially (focus on single-user performance first)

## Success Criteria

1. Developers can define complex multi-agent systems using the constructs library
2. The system correctly executes these configurations with proper agent interactions
3. End users can observe real-time agent operations
4. The journal system correctly maintains and reconstructs state
5. The system supports pausing, canceling, and resuming operations