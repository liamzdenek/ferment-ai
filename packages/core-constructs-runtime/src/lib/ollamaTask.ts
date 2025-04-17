import { z } from 'zod';
import axios from 'axios';
import { OLLAMA_MODEL_TASK_DEF, OllamaModel, OllamaTaskInputSchema, OllamaTaskOutputSchema } from '@ferment-ai/core-constructs-lib';
import { convertPromiseToGenerator, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';


export function createOllamaTaskImpl(ollamaModel: OllamaModel): TaskImpl<typeof OllamaTaskInputSchema, typeof OllamaTaskOutputSchema> {
  return {
    def: OLLAMA_MODEL_TASK_DEF,
    taskId: ollamaModel.node.path,
    execute: convertPromiseToGenerator(async (ctx: TaskCtx<typeof OllamaTaskInputSchema, typeof OllamaTaskOutputSchema>) => {
      console.log(`Executing Ollama task: ${ollamaModel.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      try {
        // Construct the API URL using the host from model props
        const apiUrl = `http://${ollamaModel.props.host}/api/generate`;
        
        // Prepare the request payload
        const requestPayload = {
          model: ollamaModel.props.modelName,
          prompt: ctx.input.prompt,
          stream: ctx.input.stream,
          format: ctx.input.format
        };
        
        console.log(`Calling Ollama API at ${apiUrl}`);
        console.log(`Request payload: ${JSON.stringify(requestPayload)}`);
        
        // Make the API call to Ollama
        const response = await axios.post(apiUrl, requestPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Ollama API response: ${JSON.stringify(response.data)}`);
        
        // Return the task result
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          taskId: ctx.taskId,
          input: ctx.input,
          output: {
            response: response.data.response,
            model: response.data.model,
            created_at: response.data.created_at,
            done: response.data.done,
            done_reason: response.data.done_reason,
            total_duration: response.data.total_duration,
            eval_count: response.data.eval_count,
            context: response.data.context
          }
        };
      } catch (error) {
        console.error(`Error calling Ollama API: ${error}`);
        
        // Return an error result
        return {
          type: 'error',
          taskDefId: ctx.taskDefId,
          taskId: ctx.taskId,
          input: ctx.input,
          error: {
            message: `Failed to call Ollama API: ${(error as any).message}`,
            details: error
          }
        };
      }
    })
  };
}