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

const ExecuteCapabilityPrompt = z.strictObject({
  type: z.literal('prompt'),
  name: z.string(),
  arguments: z.record(z.string(), z.string())
})

const ExecuteCapabilityResource = z.strictObject({
  type: z.literal('resource'),
  name: z.string(),
  uri: z.string()
})

const ExecuteCapabilityTool = z.strictObject({
  type: z.literal('tool'),
  name: z.string(),
  arguments: z.record(z.string(), z.any())
})

const ExecuteCapabilityInputSchema = z.union([ExecuteCapabilityPrompt, ExecuteCapabilityResource, ExecuteCapabilityTool]);
const ExecuteCapabilityOutputSchema = z.any();
export const EXECUTE_CAPABILITY_TASK_DEF: TaskDef<typeof ExecuteCapabilityInputSchema, typeof ExecuteCapabilityOutputSchema> = {
  taskDefId: 'CoreConstructs::ExecuteCapabilityTaskDef',
  inputType: ExecuteCapabilityInputSchema,
  outputType: ExecuteCapabilityOutputSchema
}