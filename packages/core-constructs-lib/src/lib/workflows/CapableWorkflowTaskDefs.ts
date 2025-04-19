import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

export const CapableWorkflowTaskMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

export const CapableWorkflowTaskInputSchema = z.object({
  messages: z.array(CapableWorkflowTaskMessageSchema),
  forceCapability: z.string().optional(),
});

export const CapableWorkflowTaskOutputSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string()
  }),
});

export const CAPABLE_WORKFLOW_TASK_DEF: TaskDef<typeof CapableWorkflowTaskInputSchema, typeof CapableWorkflowTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::CapableWorkflowTaskDef',
  inputType: CapableWorkflowTaskInputSchema,
  outputType: CapableWorkflowTaskOutputSchema
};
