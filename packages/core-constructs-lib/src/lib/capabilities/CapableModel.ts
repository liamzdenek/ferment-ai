import { Construct } from 'constructs';
import { CapableWorkflowTask } from '../workflows/CapableWorkflowTask.js';
import { BaseModel } from '../models/BaseModel.js';
import { BaseCapability } from './BaseCapability.js';
import { WorkflowTask } from '@ferment-ai/runtime-common';
import { z } from 'zod';
import { BaseCapabilityParser } from '../capabilityParser/BaseCapabilityParser.js';

interface CapableModelProps {
  model: BaseModel
  capabilities: BaseCapability[]
  capabilityParser: BaseCapabilityParser
}

export class CapableModel extends CapableWorkflowTask {
  public readonly props: CapableModelProps;

  constructor(
    scope: Construct,
    id: string,
    props: CapableModelProps
  ) {
    super(scope, id, {})
    this.props = props;
  }

  pushCapability(capability: BaseCapability) {
    if(this.props.capabilities.includes(capability)) {
      return;
    }
    this.props.capabilities.push(capability);
  }

  // CapableModel needs to be able to use all of its tools, and the model.
  override getReachableTasks(): Record<string, WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>> {
    const tools = {
      ...super.getReachableTasks(),
      ...this.props.capabilityParser.getReachableTasks(),
      [this.props.model.node.path]: this.props.model,
    };

    for(const capability of this.props.capabilities) {
      Object.assign(tools, capability.getReachableTasks());
    }

    return tools;
  }
}