import axios from 'axios';
import { INVOKE_MODEL_TASK_DEF, OllamaModel } from '@ferment-ai/core-constructs-lib';
import { convertPromiseToGenerator, TaskCtx, TaskImpl } from '@ferment-ai/runtime-common';
import { z } from 'zod';


export function createOllamaTaskImpl(ollamaModel: OllamaModel): TaskImpl<typeof INVOKE_MODEL_TASK_DEF.inputType, typeof INVOKE_MODEL_TASK_DEF.outputType> {
  return {
    def: INVOKE_MODEL_TASK_DEF,
    nodePath: ollamaModel.node.path,
    execute: convertPromiseToGenerator(async (ctx: TaskCtx<typeof INVOKE_MODEL_TASK_DEF.inputType, typeof INVOKE_MODEL_TASK_DEF.outputType>) => {
      console.log(`Executing Ollama chat task: ${ollamaModel.node.id}`);
      console.log(`Input: ${JSON.stringify(ctx.input)}`);
      
      try {
        // Construct the API URL using the host from model props
        const apiUrl = `http://${ollamaModel.props.host}/api/chat`;
        
        // Prepare the request payload
        const requestPayload = {
          model: ollamaModel.props.modelName,
          messages: ctx.input.messages,
          stream: false,
          format: ctx.input.format,
          options: ctx.input.options
        };
        
        console.log(`Calling Ollama Chat API at ${apiUrl}`);
        console.log(`Request payload: ${JSON.stringify(requestPayload)}`);
        
        // Make the API call to Ollama chat endpoint
        const response = await axios.post(apiUrl, requestPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Ollama Chat API response: ${JSON.stringify(response.data)}`);

        const output: z.infer<typeof INVOKE_MODEL_TASK_DEF.outputType> = {
          messages: [response.data.message],
          model: response.data.model,
          created_at: response.data.created_at,
          done: response.data.done,
          done_reason: response.data.done_reason,
          total_duration: response.data.total_duration,
          eval_count: response.data.eval_count
        }
        
        // Return the task result
        return {
          type: 'result',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          output
        };
      } catch (error) {
        console.error(`Error calling Ollama Chat API: ${error}`);
        
        // Return an error result
        return {
          type: 'error',
          taskDefId: ctx.taskDefId,
          nodePath: ctx.nodePath,
          input: ctx.input,
          error: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            message: `Failed to call Ollama Chat API: ${(error as unknown as any).message}`,
            details: error
          }
        };
      }
    })
  };
}