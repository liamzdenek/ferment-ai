import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

export const CapableWorkflowTaskMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  category: z.enum(['input', 'intermediate', 'response']).optional(),
});
export const CapableWorkflowTaskInputSchema = z.object({
  messages: z.array(CapableWorkflowTaskMessageSchema),
  force: z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('structuredOutput'),
      schema: z.unknown(),
    })
  ]).optional()
});

export const CapableWorkflowTaskOutputSchema = z.object({
  messages: z.array(CapableWorkflowTaskMessageSchema),
  structuredOutput: z.unknown().optional()
});

export const CAPABLE_WORKFLOW_TASK_DEF: TaskDef<typeof CapableWorkflowTaskInputSchema, typeof CapableWorkflowTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::CapableWorkflowTaskDef',
  inputType: CapableWorkflowTaskInputSchema,
  outputType: CapableWorkflowTaskOutputSchema
};
