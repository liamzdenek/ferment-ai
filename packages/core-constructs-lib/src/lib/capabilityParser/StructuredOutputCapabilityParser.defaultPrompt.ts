export const DEFAULT_PROMPT_STRING = `
# Structured Output Instructions

You have access to the following capabilities:

{{~it.tools :tool}}
## {{=tool.name}}
{{=tool.description ? tool.description : ''}}
Parameters: {{=JSON.stringify(tool.parameters)}}

{{~}}

## Response Format

You must respond with a valid JSON object that follows this structure:

\`\`\`json
{
  "action": "tool|prompt|resource|message",
  "name": "capability_name", // Required for tool, prompt, resource
  "arguments": {}, // Required for tool, prompt
  "uri": "resource_uri", // Required for resource
  "content": "message_content" // Required for message
}
\`\`\`

### Examples:

1. To use a tool:
\`\`\`json
{
  "action": "tool",
  "name": "search",
  "arguments": {
    "query": "weather in San Francisco"
  }
}
\`\`\`

2. To use a prompt:
\`\`\`json
{
  "action": "prompt",
  "name": "summarize",
  "arguments": {
    "text": "Long text to summarize..."
  }
}
\`\`\`

3. To access a resource:
\`\`\`json
{
  "action": "resource",
  "name": "weather",
  "uri": "weather://san-francisco/current"
}
\`\`\`

4. To return a normal message:
\`\`\`json
{
  "action": "message",
  "content": "This is a normal message response."
}
\`\`\`

Remember:
- Your response must be valid JSON
- The structure must match the format above
- Required fields must be included based on the action type
- Only call one capability at a time
`.trim();

// Multiple tool uses version of the prompt
export const MULTIPLE_TOOL_USES_PROMPT_STRING = `
# Structured Output Instructions

You have access to the following capabilities:

{{~it.tools :tool}}
## {{=tool.name}}
{{=tool.description ? tool.description : ''}}
Parameters: {{=JSON.stringify(tool.parameters)}}

{{~}}

## Response Format

You must respond with a valid JSON array of actions. Each action must follow this structure:

\`\`\`json
[
  {
    "action": "tool|prompt|resource|message",
    "name": "capability_name", // Required for tool, prompt, resource
    "arguments": {}, // Required for tool, prompt
    "uri": "resource_uri", // Required for resource
    "content": "message_content" // Required for message
  },
  // More actions can be included here
]
\`\`\`

### Examples:

1. Multiple tool uses:
\`\`\`json
[
  {
    "action": "tool",
    "name": "search",
    "arguments": {
      "query": "weather in San Francisco"
    }
  },
  {
    "action": "resource",
    "name": "weather",
    "uri": "weather://san-francisco/current"
  },
  {
    "action": "message",
    "content": "I've checked the weather for you."
  }
]
\`\`\`

2. Single message response:
\`\`\`json
[
  {
    "action": "message",
    "content": "This is a normal message response."
  }
]
\`\`\`

Remember:
- Your response must be valid JSON
- The structure must match the format above
- Required fields must be included based on the action type
- You can include multiple actions in your response
`.trim();