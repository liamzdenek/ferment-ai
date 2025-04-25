import { Construct, RootConstruct } from 'constructs';
import { WorkflowExecutor, compileWorkflow } from './execution/WorkflowExecutor.js';
import { TaskImplMap } from './execution/TaskExecution.js';
import { WorkflowDefinition } from './definitions/WorkflowDefinition.js';
import { Module } from './module.js';
import { findWorkflows } from './utils/WorkflowUtils.js';

/**
 * Options for compiling workflows
 */
export interface CompileWorkflowsOptions {
  /**
   * The root construct to compile workflows from
   */
  rootConstruct: RootConstruct;

  /**
   * An ordered list of modules to use for mapping constructs to task implementations
   */
  modules: Module[];
}

/**
 * Result of compiling workflows
 */
export interface CompileWorkflowsResult {
  /**
   * A map of workflow names to workflow executors
   */
  executors: Record<string, WorkflowExecutor>;

  /**
   * A map of node paths to task implementations
   */
  taskImpls: TaskImplMap;

  /**
   * A map of workflow names to workflow definitions
   */
  workflows: Record<string, WorkflowDefinition>;
}

/**
 * Compiles workflows from a root construct
 *
 * @param options The options for compiling workflows
 * @returns The result of compiling workflows
 */
export function compileWorkflows(options: CompileWorkflowsOptions): CompileWorkflowsResult {
  const { rootConstruct, modules } = options;
  
  // Map constructs to task implementations
  const taskImpls: TaskImplMap = {};
  const nodePathToConstruct: { [nodePath: string]: Construct } = {};
  
  for (const construct of rootConstruct.node.findAll()) {
    for (const module of modules) {
      const taskImpl = module(construct);
      if (taskImpl) {
        taskImpls[construct.node.path] = taskImpl;
        nodePathToConstruct[construct.node.path] = construct;
        break;
      }
    }
  }
  
  // Find all workflows in the construct tree
  const workflows = findWorkflows(rootConstruct);
  
  // Compile each workflow
  const executors: Record<string, WorkflowExecutor> = {};
  for (const [name, workflowDef] of Object.entries(workflows)) {
    executors[name] = compileWorkflow(workflowDef, taskImpls, nodePathToConstruct);
  }
  
  return {
    executors,
    taskImpls,
    workflows
  };
}