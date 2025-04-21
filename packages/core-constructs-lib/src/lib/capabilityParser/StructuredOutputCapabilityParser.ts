import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { BaseCapabilityParser } from "./BaseCapabilityParser.js";
import { FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF } from "./BaseCapabilityParserTaskDefs.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { DotTemplateParser } from "../templateParser/DotTemplateParser.js";
import { z } from "zod";

export interface StructuredOutputCapabilityParserProps {
  templateParser: BaseTemplateParser;
  allowMultipleToolUses?: boolean; // Flag to enable multiple tool uses in a single call (default: false)
}

const DEFAULT_PROMPT_STRING = `
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
const MULTIPLE_TOOL_USES_PROMPT_STRING = `
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

export class StructuredOutputCapabilityParser extends BaseCapabilityParser {

  public formatPrompt: WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>;
  public parseModelResponse: WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>;

  public readonly props: StructuredOutputCapabilityParserProps;

  constructor(scope: Construct, id: string, props?: Partial<StructuredOutputCapabilityParserProps>) {
    super(scope, id);
    
    // Create a default DotTemplateParser if not provided
    const templateParser = props?.templateParser || new DotTemplateParser(this, 'DefaultTemplateParser', {
      template: props?.allowMultipleToolUses ? MULTIPLE_TOOL_USES_PROMPT_STRING : DEFAULT_PROMPT_STRING
    });
    
    this.props = {
      templateParser,
      allowMultipleToolUses: props?.allowMultipleToolUses ?? false,
      ...(props ?? {})
    };
    
    const subProps = {
      capabilityParser: this
    };
    
    this.formatPrompt = new StructuredOutputCapabilityParserFormatPromptTask(this, 'FormatPrompt', subProps);
    this.parseModelResponse = new StructuredOutputCapabilityParserParseModelResponseTask(this, 'ParseModelResponse', subProps);
  }
}

export interface StructuredOutputCapabilityParserTaskProps {
  capabilityParser: StructuredOutputCapabilityParser;
}

export class StructuredOutputCapabilityParserFormatPromptTask extends WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
  public override taskDef = FORMAT_PROMPT_TASK_DEF;

  constructor(scope: Construct, id: string, public props: StructuredOutputCapabilityParserTaskProps) {
    super(scope, id, {});
  }

  override getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getTools(),
      [this.props.capabilityParser.props.templateParser.node.path]: this.props.capabilityParser.props.templateParser
    };
  }
}

export class StructuredOutputCapabilityParserParseModelResponseTask extends WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  public override taskDef = PARSE_MODEL_RESPONSE_TASK_DEF;

  constructor(scope: Construct, id: string, public props: StructuredOutputCapabilityParserTaskProps) {
    super(scope, id, {});
  }
}