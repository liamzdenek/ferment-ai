import { z } from 'zod';
import { TaskDefinitionSchema } from './TaskDefinition.js';

/**
 * Schema for a workflow definition
 */
export const WorkflowDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the workflow'),
  name: z.string().describe('The name of the workflow'),
  description: z.string().optional().describe('A description of what the workflow does'),
  tasks: z.record(z.string(), TaskDefinitionSchema).describe('A map of Node IDs to task definitions'),
  entryPoints: z.record(z.string(), z.string()).describe('A map of entry point names to Node IDs')
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;