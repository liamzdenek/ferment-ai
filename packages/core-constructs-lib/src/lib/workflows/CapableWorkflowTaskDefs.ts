import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

export const CapableWorkflowForceCapability = z.strictObject({
  capabilityNodePath: z.string(),
  type: z.enum(['prompt', 'resource', 'tool']),
  name: z.string()
})

export const CapableWorkflowTaskMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  category: z.enum(['input', 'intermediate', 'response']).optional(),
});
export const CapableWorkflowTaskInputSchema = z.object({
  messages: z.array(CapableWorkflowTaskMessageSchema),
  forceCapability: CapableWorkflowForceCapability.optional()
});

export const CapableWorkflowTaskOutputSchema = z.object({
  messages: z.array(CapableWorkflowTaskMessageSchema),
});

export const CAPABLE_WORKFLOW_TASK_DEF: TaskDef<typeof CapableWorkflowTaskInputSchema, typeof CapableWorkflowTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::CapableWorkflowTaskDef',
  inputType: CapableWorkflowTaskInputSchema,
  outputType: CapableWorkflowTaskOutputSchema
};
