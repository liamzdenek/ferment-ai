import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

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