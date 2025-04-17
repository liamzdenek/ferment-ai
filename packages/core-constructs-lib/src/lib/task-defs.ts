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


// Define task input/output schemas
export const AgentContextInputSchema = z.any();
export const AgentContextOutputSchema = z.any();

export const ModelInputSchema = z.any();
export const ModelOutputSchema = z.any();

export const PromptTaskInputSchema = z.any();
export const PromptTaskOutputSchema = z.any();

export const EndTaskInputSchema = z.any();
export const EndTaskOutputSchema = z.any();

// Define task definitions
export const AGENT_CONTEXT_TASK_DEF: TaskDef<typeof AgentContextInputSchema, typeof AgentContextOutputSchema> = {
  taskDefId: 'CoreConstructs::AgentContextTaskDef',
  inputType: AgentContextInputSchema,
  outputType: AgentContextOutputSchema
};

export const OPENAI_MODEL_TASK_DEF: TaskDef<typeof ModelInputSchema, typeof ModelOutputSchema> = {
  taskDefId: 'CoreConstructs::OpenAIModelTaskDef',
  inputType: ModelInputSchema,
  outputType: ModelOutputSchema
};
export const MODEL_TASK_DEF: TaskDef<typeof ModelInputSchema, typeof ModelOutputSchema> = {
  taskDefId: 'CoreConstructs::ModelTaskDef',
  inputType: ModelInputSchema,
  outputType: ModelOutputSchema
};

export const PROMPT_TASK_DEF: TaskDef<typeof PromptTaskInputSchema, typeof PromptTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::PromptTaskDef',
  inputType: PromptTaskInputSchema,
  outputType: PromptTaskOutputSchema
};

export const END_TASK_DEF: TaskDef<typeof EndTaskInputSchema, typeof EndTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::EndTaskDef',
  inputType: EndTaskInputSchema,
  outputType: EndTaskOutputSchema
};