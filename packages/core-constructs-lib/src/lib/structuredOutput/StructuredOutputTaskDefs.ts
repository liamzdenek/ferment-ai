import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";
import { CAPABLE_WORKFLOW_TASK_DEF } from "../workflows/CapableWorkflowTaskDefs.js";

const StructuredOutputOutputSchema = CAPABLE_WORKFLOW_TASK_DEF.outputType.extend({
  structuredOutput: z.unknown()
})
export const STRUCTURED_OUTPUT_TASK_DEF: TaskDef<typeof CAPABLE_WORKFLOW_TASK_DEF.inputType, typeof StructuredOutputOutputSchema> = {
  taskDefId: 'CoreConstructs::FormatPrompt',
  inputType: CAPABLE_WORKFLOW_TASK_DEF.inputType,
  outputType: StructuredOutputOutputSchema
};