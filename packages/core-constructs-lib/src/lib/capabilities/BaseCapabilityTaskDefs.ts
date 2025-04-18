import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";

const GetAvailableCapabilitiesInputSchema = z.union([z.void(), z.undefined(), z.null()]);
const GetAvailableCapabilitiesOutputSchema = z.strictObject({
  prompts: z.array(z.strictObject({
    name: z.string(),
    arguments: z.array(z.strictObject({
      name: z.string(),
      required: z.boolean().optional()
    })).optional()
  })),
  resources: z.array(z.strictObject({
    uri: z.string(),
    name: z.string()
  })),
  tools: z.array(z.strictObject({
    name: z.string(),
    inputSchema: z.any(),
  }))
})
export const GET_AVAILABLE_CAPABILITIES_TASK_DEF: TaskDef<typeof GetAvailableCapabilitiesInputSchema, typeof GetAvailableCapabilitiesOutputSchema> = {
  taskDefId: 'CoreConstructs::GetAvailableCapabilitiesTaskDef',
  inputType: GetAvailableCapabilitiesInputSchema,
  outputType: GetAvailableCapabilitiesOutputSchema
};

const ExecuteCapabilityInputSchema = z.any();
const ExecuteCapabilityOutputSchema = z.any();
export const EXECUTE_CAPABILITY_TASK_DEF: TaskDef<typeof ExecuteCapabilityInputSchema, typeof ExecuteCapabilityOutputSchema> = {
  taskDefId: 'CoreConstructs::ExecuteCapabilityTaskDef',
  inputType: ExecuteCapabilityInputSchema,
  outputType: ExecuteCapabilityOutputSchema
}