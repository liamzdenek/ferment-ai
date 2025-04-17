import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

// Input Schema for Ollama Task
export const OllamaTaskInputSchema = z.object({
  prompt: z.string(),
  stream: z.boolean().default(false),
  format: z.object({
    type: z.string(),
    properties: z.record(z.any()),
    required: z.array(z.string())
  }).optional()
});

// Output Schema for Ollama Task
export const OllamaTaskOutputSchema = z.object({
  response: z.string(),
  model: z.string(),
  created_at: z.string(),
  done: z.boolean(),
  done_reason: z.string().optional(),
  total_duration: z.number().optional(),
  eval_count: z.number().optional(),
  context: z.array(z.number()).optional()
});

export const OLLAMA_MODEL_TASK_DEF: TaskDef<typeof OllamaTaskInputSchema, typeof OllamaTaskOutputSchema> = {
  taskDefId: 'CoreConstructs::OllamaModelTaskDef',
  inputType: OllamaTaskInputSchema,
  outputType: OllamaTaskOutputSchema
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