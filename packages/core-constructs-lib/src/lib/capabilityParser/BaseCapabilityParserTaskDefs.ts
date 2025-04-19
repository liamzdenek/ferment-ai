import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";
import { GET_AVAILABLE_CAPABILITIES_TASK_DEF } from "../capabilities/BaseCapabilityTaskDefs.js";
import { CapableWorkflowTaskMessageSchema } from "../workflows/CapableWorkflowTaskDefs.js";

const FormatPromptInputSchema = z.strictObject({
  messages: CapableWorkflowTaskMessageSchema.array(),
  availableCapabilities: GET_AVAILABLE_CAPABILITIES_TASK_DEF.outputType,
});
const FormatPromptOutputSchema = z.strictObject({
  messages: CapableWorkflowTaskMessageSchema.array(),
})
export const FORMAT_PROMPT_TASK_DEF: TaskDef<typeof FormatPromptInputSchema, typeof FormatPromptOutputSchema> = {
  taskDefId: 'CoreConstructs::FormatPrompt',
  inputType: FormatPromptInputSchema,
  outputType: FormatPromptOutputSchema
};


const ParseModelResponseInputSchema = z.strictObject({

});
const ParseModelResponseOutputSchema = z.strictObject({});
export const PARSE_MODEL_RESPONSE_TASK_DEF: TaskDef<typeof ParseModelResponseInputSchema, typeof ParseModelResponseOutputSchema> = {
  taskDefId: 'CoreConstructs::ParseModelResponse',
  inputType: ParseModelResponseInputSchema,
  outputType: ParseModelResponseOutputSchema
}