import { WorkflowTask } from "@ferment-ai/runtime-common";
import { Construct } from "constructs";
import { BaseCapability } from "./BaseCapability.js";
import { GET_AVAILABLE_CAPABILITIES_TASK_DEF, EXECUTE_CAPABILITY_TASK_DEF } from "./BaseCapabilityTaskDefs.js";

export interface StdioTransport {
  type: 'stdio',
  command: string;
  args?: string[];
}

export interface HttpTransport {
  type: 'http';
  uri: string;
  //sessionIdGenerator
}

export interface MCPToolProps {
  transport: StdioTransport | HttpTransport
}

export class MCPCapability extends BaseCapability {

  public getAvailableCapabilities: WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType>;
  public executeCapability: WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType>;

  public readonly props: MCPToolProps;

  constructor(scope: Construct, id: string, props: MCPToolProps) {
    super(scope, id);
    this.props = props;
    const subProps: MCPCapabilityTaskProps = {
      mcpCapability: this
    }
    this.getAvailableCapabilities = new MCPCapabilityGetAvailableCapabilities(this, 'GetAvailableCapabilities', subProps);
    this.executeCapability = new MCPCapabilityExecuteCapability(this, 'ExecuteCapability', subProps);
  }
}

export interface MCPCapabilityTaskProps {
  mcpCapability: MCPCapability;
}

export class MCPCapabilityGetAvailableCapabilities extends WorkflowTask<typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.inputType, typeof GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType> {
  public override taskDef = GET_AVAILABLE_CAPABILITIES_TASK_DEF;

  constructor(scope: Construct, id: string, public props: MCPCapabilityTaskProps) {
    super(scope, id, {});
  }
}

export class MCPCapabilityExecuteCapability extends WorkflowTask<typeof EXECUTE_CAPABILITY_TASK_DEF.inputType, typeof EXECUTE_CAPABILITY_TASK_DEF.outputType> {
  public override taskDef = EXECUTE_CAPABILITY_TASK_DEF;

  constructor(scope: Construct, id: string, public props: MCPCapabilityTaskProps) {
    super(scope, id, {});
  }
}