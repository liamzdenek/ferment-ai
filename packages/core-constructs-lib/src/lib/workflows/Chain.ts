import { Construct } from "constructs";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { z } from "zod";
import { CapableWorkflowTaskMessageSchema } from "./CapableWorkflowTaskDefs.js";

export interface ChainLink {
  capableTask: CapableWorkflowTask,
  messages?: z.infer<typeof CapableWorkflowTaskMessageSchema>[]
}

export interface ChainProps {
  links: Array<ChainLink>
}

export class Chain extends CapableWorkflowTask {

  public readonly props: ChainProps;

  constructor(
    scope: Construct,
    id: string,
    props?: Partial<ChainProps>
  ) {
    super(scope, id, {})
    this.props = {
      links: [],
      ...props
    };
  }

  pushLink(link: ChainLink) {
    this.props.links.push(link)
  }
}

export class LLMGate extends CapableWorkflowTask {

}