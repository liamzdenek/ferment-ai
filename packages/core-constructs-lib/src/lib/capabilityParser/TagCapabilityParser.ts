import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { BaseCapabilityParser } from "./BaseCapabilityParser.js";
import { FORMAT_PROMPT_TASK_DEF, PARSE_MODEL_RESPONSE_TASK_DEF } from "./BaseCapabilityParserTaskDefs.js";
import { DotTemplateParser } from "../templateParser/DotTemplateParser.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";
import { z } from "zod";
import { DEFAULT_PROMPT_STRING } from "./TagCapabilityParser.defaultPrompt.js";

export interface TagCapabilityParserProps {
  templateParser: BaseTemplateParser,
}

export class TagCapabilityParser extends BaseCapabilityParser {

  public formatPrompt: WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType>;
  public parseModelResponse: WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType>;

  public readonly props: TagCapabilityParserProps;

  constructor(scope: Construct, id: string, props?: Partial<TagCapabilityParserProps>) {
    super(scope, id);
    
    // Create a default DotTemplateParser if not provided
    const templateParser = props?.templateParser ?? new DotTemplateParser(this, 'DefaultTemplateParser', {
      template: DEFAULT_PROMPT_STRING
    });
    
    this.props = {
      templateParser,
      ...(props ?? {})
    };
    
    const subProps = {
      capabilityParser: this
    };
    
    this.formatPrompt = new TagCapabilityParserFormatPromptTask(this, 'FormatPrompt', subProps);
    this.parseModelResponse = new TagCapabilityParserParseModelResponseTask(this, 'ParseModelResponse', subProps);
  }
}

export interface TagCapabilityParserTaskProps {
  capabilityParser: TagCapabilityParser;
}

export class TagCapabilityParserFormatPromptTask extends WorkflowTask<typeof FORMAT_PROMPT_TASK_DEF.inputType, typeof FORMAT_PROMPT_TASK_DEF.outputType> {
  public override taskDef = FORMAT_PROMPT_TASK_DEF;

  constructor(scope: Construct, id: string, public props: TagCapabilityParserTaskProps) {
    super(scope, id, {});
  }
  
  override getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getReachableTasks(),
      [this.props.capabilityParser.props.templateParser.node.path]: this.props.capabilityParser.props.templateParser
    };
  }
}

export class TagCapabilityParserParseModelResponseTask extends WorkflowTask<typeof PARSE_MODEL_RESPONSE_TASK_DEF.inputType, typeof PARSE_MODEL_RESPONSE_TASK_DEF.outputType> {
  public override taskDef = PARSE_MODEL_RESPONSE_TASK_DEF;

  constructor(scope: Construct, id: string, public props: TagCapabilityParserTaskProps) {
    super(scope, id, {});
  }
}