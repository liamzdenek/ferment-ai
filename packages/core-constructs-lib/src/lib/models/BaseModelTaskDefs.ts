import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

export const InvokeChatModelMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

// Input Schema for Ollama Task
export const InvokeChatModelTaskInputSchema = z.object({
  messages: z.array(InvokeChatModelMessageSchema),
  format: z.object({
    type: z.string(),
    properties: z.record(z.any()),
    required: z.array(z.string())
  }).optional(),
  options: z.object({
    temperature: z.number()
  }).optional()
});

// Output Schema for Ollama Task
export const InvokeChatModelTaskOutputSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string()
  }),
  model: z.string(),
  created_at: z.string(),
  done: z.boolean(),
  done_reason: z.string().optional(),
  total_duration: z.number().optional(),
  eval_count: z.number().optional()
});

export const INVOKE_MODEL_TASK_DEF: TaskDef<typeof InvokeChatModelTaskInputSchema, typeof InvokeChatModelTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::OllamaModelTaskDef',
  inputType: InvokeChatModelTaskInputSchema,
  outputType: InvokeChatModelTaskOutputSchema
};
