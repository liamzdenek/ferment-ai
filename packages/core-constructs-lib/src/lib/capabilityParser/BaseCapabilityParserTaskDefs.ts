import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";
import { EXECUTE_CAPABILITY_TASK_DEF, GET_AVAILABLE_CAPABILITIES_TASK_DEF } from "../capabilities/BaseCapabilityTaskDefs.js";
import { INVOKE_MODEL_TASK_DEF } from "../models/BaseModelTaskDefs.js";
import { CapableWorkflowForceCapability, CapableWorkflowTaskMessageSchema } from "../workflows/CapableWorkflowTaskDefs.js";

const FormatPromptInputSchema = z.strictObject({
  messages: CapableWorkflowTaskMessageSchema.array(),
  availableCapabilities: GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType,
  forceCapability: CapableWorkflowForceCapability.optional()
});
const FormatPromptOutputSchema = z.strictObject({
  prompt: INVOKE_MODEL_TASK_DEF.inputType
})
export const FORMAT_PROMPT_TASK_DEF: TaskDef<typeof FormatPromptInputSchema, typeof FormatPromptOutputSchema> = {
  taskDefId: 'CoreConstructs::FormatPrompt',
  inputType: FormatPromptInputSchema,
  outputType: FormatPromptOutputSchema
};


const ParseModelResponseInputSchema = z.strictObject({
  availableCapabilities: GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType,
  messageHistory: z.array(CapableWorkflowTaskMessageSchema),
  newMessages: z.array(CapableWorkflowTaskMessageSchema),
});
const ParseModelResponseOutputSchema = z.strictObject({
  executionRequests: z.array(EXECUTE_CAPABILITY_TASK_DEF.inputType),
  newMessages: z.array(CapableWorkflowTaskMessageSchema),
});
export const PARSE_MODEL_RESPONSE_TASK_DEF: TaskDef<typeof ParseModelResponseInputSchema, typeof ParseModelResponseOutputSchema> = {
  taskDefId: 'CoreConstructs::ParseModelResponse',
  inputType: ParseModelResponseInputSchema,
  outputType: ParseModelResponseOutputSchema
}