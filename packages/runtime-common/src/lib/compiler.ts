import { Construct, RootConstruct } from 'constructs';
import {
  WorkflowDefinition,
  TaskImplMap,
  WorkflowExecutor,
  compileWorkflow,
} from './workflow.js';
import { Module } from './module.js';
import { Workflow } from './builtin-constructs.js';

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
   * A map of task IDs to task implementations
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
  //console.log('Mapping constructs to task implementations...');
  for (const construct of rootConstruct.node.findAll()) {
    for (const module of modules) {
      const taskImpl = module(construct);
      if (taskImpl) {
        //console.log(`Found task implementation for construct: ${construct.node.id}, path: ${construct.node.path}`);
        taskImpls[construct.node.path] = taskImpl;
        break;
      }
    }
  }
  
  //console.log('Task implementations:', Object.keys(taskImpls));
  
  // Find all workflows in the construct tree
  const workflows = findWorkflows(rootConstruct);
  
  // Compile each workflow
  const executors: Record<string, WorkflowExecutor> = {};
  for (const [name, workflowDef] of Object.entries(workflows)) {
    //console.log(`Compiling workflow: ${name}`);
    //console.log('Workflow tasks:', Object.keys(workflowDef.tasks));
    executors[name] = compileWorkflow(workflowDef, taskImpls);
  }
  
  return {
    executors,
    taskImpls,
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
      const workflowName = workflowConstruct.node.path;
      const workflowDef = workflowConstruct.getDefinition()
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