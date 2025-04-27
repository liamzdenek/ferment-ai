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

  override getReachableTasks(): [string, string][] {
    return [
      ...super.getReachableTasks(),
      ...(this.props.links.map(link => [this.node.path, link.node.path] as const satisfies [string,string]))
    ];
  }
}