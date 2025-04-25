import { z } from 'zod';
import { Construct } from 'constructs';
import { TaskDef } from '../definitions/TaskDef.js';

/**
 * Task context provided to a task during execution
 */
export interface TaskCtx<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  taskDefId: string;
  nodePath: string;
  input: z.infer<I>;
  output: z.infer<O>;
  canUseTools: { [nodePath: string]: TaskDef<z.ZodTypeAny, z.ZodTypeAny> };
  nodePathToConstruct: { [nodePath: string]: Construct };
}