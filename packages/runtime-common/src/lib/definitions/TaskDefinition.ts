import { z } from 'zod';

/**
 * Schema for a task
 */
const BaseTaskDefinitionSchema = z.object({
  id: z.string().describe('The unique identifier for the task'),
  name: z.string().describe('The name of the task'),
  description: z.string().optional().describe('A description of what the task does'),
  taskDefId: z.string().describe('The global task definition ID'),
  inputType: z.any().describe('The Zod schema for input validation'),
  outputType: z.any().describe('The Zod schema for output validation'),
});

export const PreCompileTaskDefinitionSchema = BaseTaskDefinitionSchema.extend({
  //reachableTasks: z.array(z.tuple([z.string(), z.string()])).describe('Which node paths can be called by another task [[src node path, dst node path], ...]')
})
export type PreCompileTaskDefinition = z.infer<typeof PreCompileTaskDefinitionSchema>;

export const TaskDefinitionSchema = BaseTaskDefinitionSchema.extend({
  reachableTasks: z.array(z.string()).describe('Which node paths can be called by this task ')
})

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;