import { TaskDef } from "@ferment-ai/runtime-common";
import { z } from "zod";

const RenderTemplateInputSchema = z.strictObject({
  data: z.record(z.any()),
});

const RenderTemplateOutputSchema = z.strictObject({
  result: z.string(),
});

export const RENDER_TEMPLATE_TASK_DEF: TaskDef<typeof RenderTemplateInputSchema, typeof RenderTemplateOutputSchema> = {
  taskDefId: 'CoreConstructs::RenderTemplate',
  inputType: RenderTemplateInputSchema,
  outputType: RenderTemplateOutputSchema
};