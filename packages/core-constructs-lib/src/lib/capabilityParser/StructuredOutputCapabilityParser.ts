import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { BaseCapabilityParser } from "./BaseCapabilityParser.js";
import { FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF } from "./BaseCapabilityParserTaskDefs.js";

export interface StructuredOutputCapabilityParserProps {
  prompt: string,
  promptTemplateEngine: 'dot',
}

const DEFAULT_PROMPT_STRING = `
# Tool Use Instructions

You have access to the following functions:
{{~it.tools :tool}}
Use the function '{{=tool.name}}' to '{{=tool.description}}' w/ parameters: {{=JSON.stringify(tool.parameters)}}
{{~}}
If you choose to call a function ONLY reply in the following format with no prefix or suffix:
<tool_name_here>{"example_name": "example_value"}</tool_name_here>
Reminder:
- If looking for real time information use relevant functions before falling back to web search
- Function calls MUST follow the specified format, start with <name> and end with </name>
- Required parameters MUST be specified
- Only call one function at a time
- Put the entire function call reply on one line
- Do not repeat the xml-like tag or the tool will run a second time
`.trim();


export class StructuredOutputCapabilityParser extends BaseCapabilityParser {

  public formatPrompt: WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>;
  public parseModelResponse: WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>;

  public readonly props: StructuredOutputCapabilityParserProps;

  constructor(scope: Construct, id: string, props?: Partial<StructuredOutputCapabilityParserProps>) {
    super(scope, id);
    this.props = {
      prompt: DEFAULT_PROMPT_STRING,
      promptTemplateEngine: 'dot',
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
}

export class StructuredOutputCapabilityParserParseModelResponseTask extends WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  public override taskDef = PARSE_MODEL_RESPONSE_TASK_DEF;

  constructor(scope: Construct, id: string, public props: StructuredOutputCapabilityParserTaskProps) {
    super(scope, id, {});
  }
}