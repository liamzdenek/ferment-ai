import { Construct } from "constructs";
import { CapableWorkflowTask } from "./CapableWorkflowTask.js";
import { z } from "zod";
import { WorkflowTask } from "@ferment-ai/runtime-common";

export interface ChainProps {
  links: Array<CapableWorkflowTask>
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

  pushLink(link: CapableWorkflowTask) {
    this.props.links.push(link)
  }

  override getTools(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    return {
      ...super.getTools(),
      ...(Object.fromEntries(this.props.links.map(link => [link.node.path, link] as const)))
    };
  }
}