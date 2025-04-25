import { z } from 'zod';

/**
 * Schema for a task
 */
export const TaskDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the task'),
  name: z.string().describe('The name of the task'),
  description: z.string().optional().describe('A description of what the task does'),
  taskDefId: z.string().describe('The global task definition ID'),
  inputType: z.any().describe('The Zod schema for input validation'),
  outputType: z.any().describe('The Zod schema for output validation'),
  tools: z.array(z.string()).describe('The Node Paths of tasks that can be called and returned to by this task')
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;