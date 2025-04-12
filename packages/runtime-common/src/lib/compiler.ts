import { Construct, RootConstruct } from 'constructs';
import { WorkflowDefinition, TaskFunctionMap, WorkflowExecutor, compileWorkflow, TaskDefinition, TaskSchema, Workflow } from './workflow.js';
import { Module } from './module.js';

/**
 * Options for compiling workflows
 */
export interface CompileWorkflowsOptions {
  /**
   * The root construct to compile workflows from
   */
  rootConstruct: RootConstruct;

  /**
   * An ordered list of modules to use for mapping constructs to task functions
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
   * A map of task IDs to task functions
   */
  taskFunctions: TaskFunctionMap;

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
  
  // Map constructs to task functions
  const taskFunctions: TaskFunctionMap = {};
  for (const construct of rootConstruct.node.findAll()) {
    for (const module of modules) {
      const taskFunction = module(construct);
      if (taskFunction) {
        taskFunctions[construct.node.id] = taskFunction;
        break;
      }
    }
  }
  
  // Find all workflows in the construct tree
  const workflows = findWorkflows(rootConstruct);
  
  // Compile each workflow
  const executors: Record<string, WorkflowExecutor> = {};
  for (const [name, workflowDef] of Object.entries(workflows)) {
    executors[name] = compileWorkflow(workflowDef, taskFunctions);
  }
  
  return {
    executors,
    taskFunctions,
    workflows
  };
}

/**
 * Finds all workflows in a construct tree
 *
 * @param construct The construct to search
 * @returns A map of workflow names to workflow definitions
 */
function findWorkflows(construct: Construct): Record<string, WorkflowDefinition> {
  const workflowDefs: Record<string, WorkflowDefinition> = {};
  
  // Find all workflow constructs in the construct tree
  const workflowConstructs = findWorkflowConstructs(construct);
  
  // Create a workflow definition for each workflow construct
  for (const [, workflowConstruct] of Object.entries(workflowConstructs)) {
    if (workflowConstruct instanceof Workflow) {
      const workflowName = workflowConstruct.node.path.replace(/\//g, '-');
      const workflowDef = workflowConstruct.getDefinition();
      workflowDefs[workflowName] = workflowDef;
    }
  }
  
  if (Object.keys(workflowDefs).length === 0) {
    throw new Error("No workflows were found; is your Construct tree complete? You must declare at least one new Workflow()")
  }
  
  return workflowDefs;
}

/**
 * Finds all workflow constructs in a construct tree
 *
 * @param construct The construct to search
 * @returns A map of workflow IDs to workflow constructs
 */
function findWorkflowConstructs(construct: Construct): Record<string, Construct> {
  const workflows: Record<string, Construct> = {};
  
  // Check if the construct is a workflow
  if (construct instanceof Workflow) {
    workflows[construct.node.id] = construct;
  }
  
  // Recursively search child constructs
  for (const child of construct.node.children) {
    const childWorkflows = findWorkflowConstructs(child);
    Object.assign(workflows, childWorkflows);
  }
  
  return workflows;
}

/**
 * Finds all entrypoints in a construct tree
 *
 * @param construct The construct to search
 * @returns A map of entrypoint IDs to entrypoints
 */
function findEntrypoints(construct: Construct): Record<string, Construct> {
  const entrypoints: Record<string, Construct> = {};
  
  // Check if the construct is an entrypoint
  if (construct.node.id.includes('Entrypoint')) {
    entrypoints[construct.node.id] = construct;
  }
  
  // Recursively search child constructs
  for (const child of construct.node.children) {
    const childEntrypoints = findEntrypoints(child);
    Object.assign(entrypoints, childEntrypoints);
  }
  
  return entrypoints;
}