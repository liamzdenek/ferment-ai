import { WorkflowError } from './lib/execution/ErrorHandling.js';

// Re-export constructs
export { Workflow } from './lib/constructs/Workflow.js';
export type { WorkflowOptions } from './lib/constructs/Workflow.js';
export { 
  WorkflowTask, 
  isWorkflowTask 
} from './lib/constructs/WorkflowTask.js';
export type { WorkflowTaskOptions } from './lib/constructs/WorkflowTask.js';

// Re-export definitions
export type { TaskDef } from './lib/definitions/TaskDef.js';
export { TaskDefinitionSchema } from './lib/definitions/TaskDefinition.js';
export type { TaskDefinition } from './lib/definitions/TaskDefinition.js';
export { WorkflowDefinitionSchema } from './lib/definitions/WorkflowDefinition.js';
export type { WorkflowDefinition } from './lib/definitions/WorkflowDefinition.js';

// Re-export utils
export {
  convertPromiseToGenerator,
  getTaskCall,
  getTaskCallParallel
} from './lib/utils/TaskUtils.js';
export type { TaskExecutePromise } from './lib/utils/TaskUtils.js';
export {
  findWorkflows,
  findWorkflowConstructs
} from './lib/utils/WorkflowUtils.js';

// Re-export compiler and journal
export { compileWorkflows } from './lib/compiler.js';
export type { 
  CompileWorkflowsOptions, 
  CompileWorkflowsResult
} from './lib/compiler.js';
export type { Journal } from './lib/journal.js';
export type { Module } from './lib/module.js';

export { WorkflowError } from './lib/execution/ErrorHandling.js'
export type { WorkflowExecutionOptions, WorkflowLogEvent } from './lib/execution/TaskMessaging.js';