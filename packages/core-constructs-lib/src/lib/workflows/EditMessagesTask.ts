import { Construct } from "constructs";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { z } from "zod";
import { CapableWorkflowTaskMessageSchema } from "./CapableWorkflowTaskDefs.js";
import { BaseTemplateParser } from "../templateParser/BaseTemplateParser.js";

export interface EditMessagesTaskProps {
  messagesUnshift?: z.infer<typeof CapableWorkflowTaskMessageSchema>[]
  messagesPush?: z.infer<typeof CapableWorkflowTaskMessageSchema>[]
  appendToLatestMessage?: string //| BaseTemplateParser
}

export class EditMessagesTask extends CapableWorkflowTask {
  public readonly props: EditMessagesTaskProps;

  constructor(
    scope: Construct,
    id: string,
    props?: Partial<EditMessagesTaskProps>
  ) {
    super(scope, id, {})
    this.props = {
      ...props
    };
  }
}