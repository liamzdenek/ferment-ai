import { Construct } from 'constructs';
import {
  AgentContext,
  OpenAIModel,
  Model
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
 * Creates a task function for an OpenAIModel
 *
 * @param model The OpenAI model
 * @returns A task function
 */
function createOpenAIModelTaskFunction(model: OpenAIModel): TaskFunction {
  return async (input: any) => {
    console.log(`Executing OpenAI model: ${model.node.id}`);
    console.log(`Model ID: ${model.modelId}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would call the OpenAI API
    // For now, just return a dummy response
    return {
      response: `Response from ${model.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for a Model
 *
 * @param model The model
 * @returns A task function
 */
function createModelTaskFunction(model: Model): TaskFunction {
  return async (input: any) => {
    console.log(`Executing model: ${model.node.id}`);
    console.log(`Model ID: ${model.modelId}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would call the model API
    // For now, just return a dummy response
    return {
      response: `Response from ${model.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for a prompt task
 *
 * @param task The prompt task
 * @returns A task function
 */
function createPromptTaskFunction(task: Workflow.Task): TaskFunction {
  return async (input: any) => {
    console.log(`Executing prompt task: ${task.node.id}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    console.log(`Task:`, task);

    return {
      toolCall: {
        toolId: "RootConstruct/TwoAgentModel/JuniorEngineerTask/JuniorEngineerTaskSendEmailTool",
        toolInput: { "TEST": "INPUT" }
      }
    }
    
    // In a real implementation, this would process the prompt
    // For now, just return a dummy response
    return {
      response: `Response from prompt task ${task.node.id}`,
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
    
    // Check if the construct is an OpenAIModel
    if (construct instanceof OpenAIModel) {
      return createOpenAIModelTaskFunction(construct);
    }
    
    // Check if the construct is a Model
    if (construct instanceof Model) {
      return createModelTaskFunction(construct);
    }
    
    // Check if the construct is a Workflow.Task
    if (construct instanceof Workflow.Task) {
      // Check if it's an EndTask
      if (construct instanceof Workflow.EndTask) {
        return createWorkflowEndTaskFunction(construct);
      }
      
      return createPromptTaskFunction(construct);
    }
    
    // No task function for this construct
    return undefined;
  };
}