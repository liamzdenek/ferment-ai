import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";

export const MCPCapabilityInputSchema = z.any();
export const MCPCapabilityOutputSchema = z.any();
export const MCP_CAPABILITY_TASK_DEF: TaskDef<typeof MCPCapabilityInputSchema, typeof MCPCapabilityOutputSchema> = {
  taskDefId: 'CoreConstructs::MCPCapabilityTaskDef',
  inputType: MCPCapabilityInputSchema,
  outputType: MCPCapabilityOutputSchema
};
