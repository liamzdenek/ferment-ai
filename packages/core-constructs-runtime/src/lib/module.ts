import { Construct } from 'constructs';
import {
  AgentContext,
  AGENT_CONTEXT_TASK_DEF,
  OPENAI_MODEL_TASK_DEF,
  MODEL_TASK_DEF,
  PROMPT_TASK_DEF,
  END_TASK_DEF,
  AgentContextInputSchema,
  AgentContextOutputSchema,
  ModelInputSchema,
  ModelOutputSchema,
  PromptTaskInputSchema,
  PromptTaskOutputSchema,
  EndTaskInputSchema,
  EndTaskOutputSchema,
  INVOKE_MODEL_TASK_DEF,
  OllamaModel
} from '@ferment-ai/core-constructs-lib';
import {
  Module,
  TaskImpl,
  TaskCtx,
  TaskCallAndReturnRequest,
  WorkflowTask,
  WorkflowEndTask
} from '@ferment-ai/runtime-common';
import { createOllamaTaskImpl } from './ollamaTask.js';
import { z } from 'zod';
import { createAgentContextTaskImpl } from './agentContextTask.js';

/**
 * Configuration for task execution
 */
export const TaskConfig = {
  /**
   * Delay in milliseconds between task execution steps
   * This is useful for slowing down execution for testing and visualization
   */
  executionDelay: 4000
};

/**
 * Helper function to add a delay
 *
 * @param ms Milliseconds to delay
 * @returns A promise that resolves after the delay
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a task implementation for an OpenAIModel
 *
 * @param model The OpenAI model
 * @returns A task implementation
 */
function OLDcreateOpenAIModelTaskImpl(model: OpenAIModel): TaskImpl<typeof ModelInputSchema, typeof ModelOutputSchema> {
  return {
    def: OPENAI_MODEL_TASK_DEF,
    taskId: model.node.path,
    execute: async (ctx: TaskCtx<typeof ModelInputSchema, typeof ModelOutputSchema>) => {
      console.log(`Executing OpenAI model: ${model.node.id}`);
      console.log(`Model ID: ${model.modelId}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      // Add a delay to make execution more visible
      await delay(TaskConfig.executionDelay);
      
      // In a real implementation, this would call the OpenAI API
      // For now, just return a dummy response
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        taskId: ctx.taskId,
        input: ctx.input,
        output: {
          response: `Response from ${model.node.id}`,
          input: ctx.input
        }
      };
    }
  };
}

/**
 * Creates a task implementation for a Model
 *
 * @param model The model
 * @returns A task implementation
 */
function OLDcreateModelTaskImpl(model: Model): TaskImpl<typeof ModelInputSchema, typeof ModelOutputSchema> {
  return {
    def: MODEL_TASK_DEF,
    taskId: model.node.path,
    execute: async (ctx: TaskCtx<typeof ModelInputSchema, typeof ModelOutputSchema>) => {
      console.log(`Executing model: ${model.node.id}`);
      console.log(`Model ID: ${model.modelId}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      // Add a delay to make execution more visible
      await delay(TaskConfig.executionDelay);
      
      // In a real implementation, this would call the model API
      // For now, just return a dummy response
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        taskId: ctx.taskId,
        input: ctx.input,
        output: {
          response: `Response from ${model.node.id}`,
          input: ctx.input
        }
      };
    }
  };
}

/**
 * Creates a task implementation for a prompt task
 *
 * @param task The prompt task
 * @returns A task implementation
 */
function OLDcreatePromptTaskImpl(task: WorkflowTask<z.ZodTypeAny, z.ZodTypeAny>): TaskImpl<typeof PromptTaskInputSchema, typeof PromptTaskOutputSchema> {
  return {
    def: PROMPT_TASK_DEF,
    taskId: task.node.path,
    execute: async function* (ctx: TaskCtx<typeof PromptTaskInputSchema, typeof PromptTaskOutputSchema>) {
      //console.log(`Executing prompt task: ${task.node.id}`);
      //console.log(`Input: ${JSON.stringify(ctx.input)}`);
      //console.log(`Task:`, task);
      //console.log("Got canUseTools:", ctx.canUseTools);

      // Add a delay to make execution more visible
      await delay(TaskConfig.executionDelay);

      // Example of calling another task and returning to this task
      if (Object.keys(ctx.canUseTools).length > 0) {
        // Get the first available tool
        const toolEntry = Object.entries(ctx.canUseTools)[0];
        const [toolId, toolDef] = toolEntry;
        
        // Create a tool call request
        const toolCall: TaskCallAndReturnRequest = {
          type: 'callAndReturn',
          taskDefId: toolDef.taskDefId,
          taskId: toolId,
          input: { "TEST": "INPUT" }
        };
        
        // Yield control to the tool and wait for result
        const result = yield toolCall;
        
        // Add another delay after receiving the result
        await delay(TaskConfig.executionDelay);
        
        // Process the result
        console.log(`Received result from tool: ${JSON.stringify(result)}`);
      }
      
      // Return the final result
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        taskId: ctx.taskId,
        input: ctx.input,
        output: {
          response: `Response from prompt task ${task.node.id}`,
          input: ctx.input
        }
      };
    }
  };
}

/**
 * Creates a task implementation for a Workflow.EndTask
 *
 * @param endTask The end task
 * @returns A task implementation
 */
function OLDcreateWorkflowEndTaskImpl(endTask: WorkflowEndTask): TaskImpl<typeof EndTaskInputSchema, typeof EndTaskOutputSchema> {
  return {
    def: END_TASK_DEF,
    taskId: endTask.node.path,
    execute: async (ctx: TaskCtx<typeof EndTaskInputSchema, typeof EndTaskOutputSchema>) => {
      //console.log(`Executing workflow end task: ${endTask.node.id}`);
      //console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      // Add a delay to make execution more visible
      await delay(TaskConfig.executionDelay);
      
      // In a real implementation, this would finalize the workflow
      // For now, just return a dummy response
      return {
        type: 'result',
        taskDefId: ctx.taskDefId,
        taskId: ctx.taskId,
        input: ctx.input,
        output: {
          response: `Workflow completed: ${endTask.node.id}`,
          input: ctx.input
        }
      };
    }
  };
}


/**
 * Creates a core constructs module
 *
 * @returns A module that maps core constructs to task implementations
 */
export function createCoreConstructsModule(): Module {
  return (construct: Construct) => {
    // Check if the construct is an AgentContext

    if(construct instanceof WorkflowTask) {
      switch(construct.taskDef.taskDefId) {
        case INVOKE_MODEL_TASK_DEF.taskDefId:
          return createOllamaTaskImpl(construct as OllamaModel); // we cast here instead of using instanceof so that reimplementors of the `-lib` works
        case AGENT_CONTEXT_TASK_DEF.taskDefId:
          return createAgentContextTaskImpl(construct as AgentContext);
        default:
          //fallthrough
      }
    }

    /*
    if (construct instanceof AgentContext) {
      return createAgentContextTaskImpl(construct);
    }
    
    // Check if the construct is an OpenAIModel
    if (construct instanceof OpenAIModel) {
      return createOpenAIModelTaskImpl(construct);
    }
    
    // Check if the construct is a Model
    if (construct instanceof Model) {
      return createModelTaskImpl(construct);
    }
    
    // Check if the construct is a Workflow.Task
    if (construct instanceof WorkflowTask) {
      // Check if it's an EndTask
      if (construct instanceof WorkflowEndTask) {
        return createWorkflowEndTaskImpl(construct);
      }

      return createPromptTaskImpl(construct);
    }
      */
    
    // No task implementation for this construct from this module. other modules may have an impl
    return undefined;
  };
}