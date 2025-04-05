# API Contracts: Ferment AI

*Note: As the project is in the planning phase, this document outlines the planned API contracts. It will be updated as the system is implemented and deployed.*

## Native API

The Ferment API is designed to be completely stateless. All state is maintained by the client and passed with each request as needed. There are no sessions stored on the server.

### Core Endpoints

#### 1. Execute Model

Executes a virtual model with a given input and optional journal state.

- **Endpoint**: `POST /api/v1/execute`
- **Content-Type**: `application/json`

**Request**:
```json
{
  "modelName": "TwoAgentModel",
  "input": "Create a simple React component that displays a counter",
  "journal": null  // Optional: Include previous journal state to continue execution
}
```

**Response** (Streaming):
```
event: journal_update
data: {"event":{"id":"evt_1","type":"execution_started","timestamp":"2025-04-05T19:00:00.000Z","payload":{"modelName":"TwoAgentModel","input":"Create a simple React component that displays a counter"}}}

event: agent_message
data: {"agentId":"SeniorEngineerAgent","message":"I'll help you create a React counter component. Let me delegate this to our junior engineer.","journalEventId":"evt_2"}

event: journal_update
data: {"event":{"id":"evt_2","type":"agent_message","timestamp":"2025-04-05T19:00:05.000Z","source":"SeniorEngineerAgent","payload":{"message":"I'll help you create a React counter component. Let me delegate this to our junior engineer."}}}

event: tool_invocation
data: {"agentId":"SeniorEngineerAgent","toolName":"sendEmail","arguments":{"recipient":"JuniorEngineerAgent","subject":"React Counter Component","body":"Please create a simple React counter component with increment and decrement buttons."},"journalEventId":"evt_3"}

event: journal_update
data: {"event":{"id":"evt_3","type":"tool_invoked","timestamp":"2025-04-05T19:00:10.000Z","source":"SeniorEngineerAgent","target":"JuniorEngineerAgent","payload":{"toolName":"sendEmail","arguments":{"recipient":"JuniorEngineerAgent","subject":"React Counter Component","body":"Please create a simple React counter component with increment and decrement buttons."}}}}

event: agent_message
data: {"agentId":"JuniorEngineerAgent","message":"I'll create a React counter component right away.","journalEventId":"evt_4"}

event: journal_update
data: {"event":{"id":"evt_4","type":"agent_message","timestamp":"2025-04-05T19:00:15.000Z","source":"JuniorEngineerAgent","payload":{"message":"I'll create a React counter component right away."}}}

event: tool_invocation
data: {"agentId":"JuniorEngineerAgent","toolName":"saveFile","arguments":{"path":"src/Counter.jsx","content":"import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h2>Counter: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n      <button onClick={() => setCount(count - 1)}>Decrement</button>\n    </div>\n  );\n}\n\nexport default Counter;"},"journalEventId":"evt_5"}

event: journal_update
data: {"event":{"id":"evt_5","type":"tool_invoked","timestamp":"2025-04-05T19:00:20.000Z","source":"JuniorEngineerAgent","payload":{"toolName":"saveFile","arguments":{"path":"src/Counter.jsx","content":"import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h2>Counter: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n      <button onClick={() => setCount(count - 1)}>Decrement</button>\n    </div>\n  );\n}\n\nexport default Counter;"}}}}

event: execution_complete
data: {"journal":{"events":[{"id":"evt_1","type":"execution_started","timestamp":"2025-04-05T19:00:00.000Z","payload":{"modelName":"TwoAgentModel","input":"Create a simple React component that displays a counter"}},{"id":"evt_2","type":"agent_message","timestamp":"2025-04-05T19:00:05.000Z","source":"SeniorEngineerAgent","payload":{"message":"I'll help you create a React counter component. Let me delegate this to our junior engineer."}},{"id":"evt_3","type":"tool_invoked","timestamp":"2025-04-05T19:00:10.000Z","source":"SeniorEngineerAgent","target":"JuniorEngineerAgent","payload":{"toolName":"sendEmail","arguments":{"recipient":"JuniorEngineerAgent","subject":"React Counter Component","body":"Please create a simple React counter component with increment and decrement buttons."}}},{"id":"evt_4","type":"agent_message","timestamp":"2025-04-05T19:00:15.000Z","source":"JuniorEngineerAgent","payload":{"message":"I'll create a React counter component right away."}},{"id":"evt_5","type":"tool_invoked","timestamp":"2025-04-05T19:00:20.000Z","source":"JuniorEngineerAgent","payload":{"toolName":"saveFile","arguments":{"path":"src/Counter.jsx","content":"import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h2>Counter: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n      <button onClick={() => setCount(count - 1)}>Decrement</button>\n    </div>\n  );\n}\n\nexport default Counter;"}}}]}}
```

**Response** (Non-Streaming):
```json
{
  "journal": {
    "events": [
      {
        "id": "evt_1",
        "type": "execution_started",
        "timestamp": "2025-04-05T19:00:00.000Z",
        "payload": {
          "modelName": "TwoAgentModel",
          "input": "Create a simple React component that displays a counter"
        }
      },
      {
        "id": "evt_2",
        "type": "agent_message",
        "timestamp": "2025-04-05T19:00:05.000Z",
        "source": "SeniorEngineerAgent",
        "payload": {
          "message": "I'll help you create a React counter component. Let me delegate this to our junior engineer."
        }
      },
      {
        "id": "evt_3",
        "type": "tool_invoked",
        "timestamp": "2025-04-05T19:00:10.000Z",
        "source": "SeniorEngineerAgent",
        "target": "JuniorEngineerAgent",
        "payload": {
          "toolName": "sendEmail",
          "arguments": {
            "recipient": "JuniorEngineerAgent",
            "subject": "React Counter Component",
            "body": "Please create a simple React counter component with increment and decrement buttons."
          }
        }
      },
      {
        "id": "evt_4",
        "type": "agent_message",
        "timestamp": "2025-04-05T19:00:15.000Z",
        "source": "JuniorEngineerAgent",
        "payload": {
          "message": "I'll create a React counter component right away."
        }
      },
      {
        "id": "evt_5",
        "type": "tool_invoked",
        "timestamp": "2025-04-05T19:00:20.000Z",
        "source": "JuniorEngineerAgent",
        "payload": {
          "toolName": "saveFile",
          "arguments": {
            "path": "src/Counter.jsx",
            "content": "import React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h2>Counter: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n      <button onClick={() => setCount(count - 1)}>Decrement</button>\n    </div>\n  );\n}\n\nexport default Counter;"
          }
        }
      }
    ]
  }
}
```

#### 2. Continue Execution

Continues execution with a new input and the previous journal state.

- **Endpoint**: `POST /api/v1/continue`
- **Content-Type**: `application/json`

**Request**:
```json
{
  "input": "Can you add a reset button to the counter?",
  "targetAgent": "SeniorEngineerAgent",
  "journal": {
    "events": [
      // Previous journal events
    ]
  }
}
```

**Response**: Same format as the Execute Model endpoint, with streaming or non-streaming options.

#### 3. Cancel Execution

To cancel an in-progress execution, merely abort the request.

#### 4. List Available Models

Lists all available virtual models.

- **Endpoint**: `GET /api/v1/models`
- **Content-Type**: `application/json`

**Response**:
```json
{
  "models": [
    {
      "name": "TwoAgentModel",
      "description": "A model with a senior engineer and junior engineer",
      "agents": ["SeniorEngineerAgent", "JuniorEngineerAgent"]
    },
    {
      "name": "CodeReviewModel",
      "description": "A model for code review with a reviewer and an implementer",
      "agents": ["ReviewerAgent", "ImplementerAgent"]
    }
  ]
}
```

### Journal Management

#### 1. Clean Journal

Cleans a journal by removing unnecessary events for a more compact representation.

- **Endpoint**: `POST /api/v1/journal/clean`
- **Content-Type**: `application/json`

**Request**:
```json
{
  "journal": {
    "events": [
      // Full journal state
    ]
  },
  "options": {
    "removeTypes": ["execution_progress", "tool_started"],
    "compressMessages": true
  }
}
```

**Response**:
```json
{
  "journal": {
    "events": [
      // Cleaned journal state
    ]
  },
  "originalSize": 15240,
  "cleanedSize": 8750
}
```

#### 2. Validate Journal

Validates a journal to ensure it's properly formatted and can be used for continued execution.

- **Endpoint**: `POST /api/v1/journal/validate`
- **Content-Type**: `application/json`

**Request**:
```json
{
  "journal": {
    "events": [
      // Journal state to validate
    ]
  }
}
```

**Response**:
```json
{
  "valid": true,
  "warnings": [
    "Event evt_12 has a missing timestamp"
  ]
}
```

## OpenAI Compatibility API (Future)

### Chat Completions

- **Endpoint**: `POST /v1/chat/completions`
- **Content-Type**: `application/json`

**Request**:
```json
{
  "model": "TwoAgentModel",
  "messages": [
    {
      "role": "user",
      "content": "Create a simple React component that displays a counter"
    }
  ],
  "stream": true,
  "ferment_journal": null  // Optional: Include previous journal state to continue execution
}
```

**Response** (Streaming):
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"role":"assistant","content":"I'll"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" help"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" you"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" create"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" a"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" React"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" counter"},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"content":" component."},"index":0,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677858242,"model":"TwoAgentModel","choices":[{"delta":{"ferment_journal":{"events":[...]}}},"index":0,"finish_reason":"stop"}]}

data: [DONE]
```

**Response** (Non-Streaming):
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "TwoAgentModel",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "I'll help you create a React counter component. Here's a simple implementation:\n\n```jsx\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h2>Counter: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n      <button onClick={() => setCount(count - 1)}>Decrement</button>\n    </div>\n  );\n}\n\nexport default Counter;\n```\n\nYou can use this component in your application by importing it and including it in your JSX."
      },
      "finish_reason": "stop",
      "index": 0,
      "ferment_journal": {
        "events": [
          // Full journal state
        ]
      }
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 230,
    "total_tokens": 250
  }
}
```

## Data Schemas

### Journal Event

```typescript
interface JournalEvent {
  id: string;
  type: string;
  timestamp: string;
  source?: string;
  target?: string;
  payload: any;
  metadata?: {
    [key: string]: any;
  };
}
```

### Common Event Types

1. **execution_started**: Execution initialization
2. **agent_message**: Message from an agent
3. **tool_invoked**: Tool invocation
4. **tool_result**: Tool execution result
5. **execution_progress**: Progress update
6. **error_occurred**: Error during execution
7. **execution_cancelled**: Execution cancellation
8. **execution_complete**: Execution completion

### Agent Status (Derived from Journal)

```typescript
type AgentStatus = "idle" | "processing" | "waiting" | "error";
```

### Execution Status (Derived from Journal)

```typescript
type ExecutionStatus = "running" | "cancelled" | "completed" | "error";
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `invalid_model` | The specified model does not exist | 400 |
| `invalid_journal` | The provided journal is invalid | 400 |
| `execution_error` | An error occurred during execution | 500 |
| `tool_error` | An error occurred during tool execution | 500 |
| `llm_error` | An error occurred during LLM invocation | 502 |
| `rate_limited` | The request was rate limited | 429 |
| `unauthorized` | The request is not authorized | 401 |