import { Construct } from 'constructs';
import {
  AgentContext,
  Entrypoint
} from '@ferment-ai/core-constructs-lib';
import { Module, TaskFunction, Workflow } from '@ferment-ai/runtime-common';

/**
 * Creates a task function for an AgentContext
 *
 * @param agentContext The agent context
 * @returns A task function
 */
function createAgentContextTaskFunction(agentContext: AgentContext): TaskFunction {
  return async (input: any) => {
    console.log(`Executing agent context: ${agentContext.node.id}`);
    console.log(`Prompt: ${agentContext.prompt}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would call the model API
    // For now, just return a dummy response
    return {
      response: `Response from ${agentContext.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for an Entrypoint
 *
 * @param entrypoint The entrypoint
 * @returns A task function
 */
function createEntrypointTaskFunction(entrypoint: Entrypoint): TaskFunction {
  return async (input: any) => {
    console.log(`Executing entrypoint: ${entrypoint.node.id}`);
    console.log(`Prompt agent: ${entrypoint.promptAgent.node.id}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would forward the input to the prompt agent
    // For now, just return a dummy response
    return {
      response: `Response from ${entrypoint.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for a Workflow.Task
 *
 * @param task The task
 * @returns A task function
 */
function createWorkflowTaskFunction(task: Workflow.Task): TaskFunction {
  return async (input: any) => {
    console.log(`Executing workflow task: ${task.node.id}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would execute the task's functionality
    // For now, just return a dummy response
    return {
      response: `Response from ${task.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for a Workflow.EndTask
 *
 * @param endTask The end task
 * @returns A task function
 */
function createWorkflowEndTaskFunction(endTask: Workflow.EndTask): TaskFunction {
  return async (input: any) => {
    console.log(`Executing workflow end task: ${endTask.node.id}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would finalize the workflow
    // For now, just return a dummy response
    return {
      response: `Workflow completed: ${endTask.node.id}`,
      input
    };
  };
}

/**
 * Creates a core constructs module
 *
 * @returns A module that maps core constructs to task functions
 */
export function createCoreConstructsModule(): Module {
  return (construct: Construct) => {
    // Check if the construct is an AgentContext
    if (construct instanceof AgentContext) {
      return createAgentContextTaskFunction(construct);
    }
    
    // Check if the construct is an Entrypoint
    if (construct instanceof Entrypoint) {
      return createEntrypointTaskFunction(construct);
    }
    
    // Check if the construct is a Workflow.Task
    if (construct instanceof Workflow.Task) {
      // Check if it's an EndTask
      if (construct instanceof Workflow.EndTask) {
        return createWorkflowEndTaskFunction(construct);
      }
      
      return createWorkflowTaskFunction(construct);
    }
    
    // No task function for this construct
    return undefined;
  };
}