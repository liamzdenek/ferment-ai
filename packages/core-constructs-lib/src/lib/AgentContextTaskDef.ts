import { z } from 'zod';
import { TaskDef } from '@ferment-ai/runtime-common';

// Define task input/output schemas
export const AgentContextInputSchema = z.any();
export const AgentContextOutputSchema = z.any();

export const AGENT_CONTEXT_TASK_DEF: TaskDef<typeof AgentContextInputSchema, typeof AgentContextOutputSchema> = {
  taskDefId: 'CoreConstructs::AgentContextTaskDef',
  inputType: AgentContextInputSchema,
  outputType: AgentContextOutputSchema
};