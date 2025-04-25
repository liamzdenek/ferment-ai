import { Construct } from 'constructs';
import { Workflow } from '../constructs/Workflow.js';
import { WorkflowDefinition } from '../definitions/WorkflowDefinition.js';

/**
 * Finds all workflows in a construct tree
 *
 * @param construct The construct to search
 * @returns A map of workflow names to workflow definitions
 */
export function findWorkflows(construct: Construct): Record<string, WorkflowDefinition> {
  const workflowDefs: Record<string, WorkflowDefinition> = {};
  
  // Find all workflow constructs in the construct tree
  const workflowConstructs = findWorkflowConstructs(construct);
  
  // Create a workflow definition for each workflow construct
  for (const [, workflowConstruct] of Object.entries(workflowConstructs)) {
    if (workflowConstruct instanceof Workflow) {
      const workflowNodePath = workflowConstruct.node.path;
      const workflowDef = workflowConstruct.getDefinition();
      workflowDefs[workflowNodePath] = workflowDef;
    }
  }
  
  if (Object.keys(workflowDefs).length === 0) {
    throw new Error("No workflows were found; is your Construct tree complete? You must declare at least one `new Workflow()`");
  }
  
  return workflowDefs;
}

/**
 * Finds all workflow constructs in a construct tree
 *
 * @param construct The construct to search
 * @returns A map of workflow IDs to workflow constructs
 */
export function findWorkflowConstructs(construct: Construct): Record<string, Construct> {
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