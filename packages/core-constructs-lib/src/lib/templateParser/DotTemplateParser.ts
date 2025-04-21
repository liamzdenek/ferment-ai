import { Construct } from "constructs";
import { BaseTemplateParser } from "./BaseTemplateParser.js";

export interface DotTemplateParserProps {
  template: string;
  stripWhitespace?: boolean;
  // Add other dot template settings as needed
}

export class DotTemplateParser extends BaseTemplateParser {
  public readonly props: DotTemplateParserProps;

  constructor(scope: Construct, id: string, props: DotTemplateParserProps) {
    super(scope, id, {});
    this.props = {
      template: props.template,
      stripWhitespace: props.stripWhitespace ?? false
    };
  }
}