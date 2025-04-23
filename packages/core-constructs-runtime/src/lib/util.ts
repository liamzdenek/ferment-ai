import { STRUCTURED_OUTPUT_TASK_DEF, StructuredOutput } from "@ferment-ai/core-constructs-lib";
import { getTaskCall, TaskCallAndReturnRequest, TaskCallError, TaskCallResult, TaskCtx } from "@ferment-ai/runtime-common";
import { z } from "zod";

export function* getStructuredOutputFromTask<O extends z.ZodTypeAny>(
  ctx: TaskCtx<z.ZodTypeAny, z.ZodTypeAny>,
  task: StructuredOutput<O>,
  query: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType>
): Generator<
  TaskCallAndReturnRequest,
  Omit<TaskCallResult, 'output' | 'input'> & { input: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType>, output: z.infer<O> },
  TaskCallResult | TaskCallError
> {
  // Get the result from the task call
  const result = yield* getTaskCall(ctx, task)(query);
  
  // Parse the structured output with the output type schema
  const parsedOutput = task.props.outputType.parse(result.output.structuredOutput);
  
  // Return the full result with the correctly typed output
  return {
    ...result,
    output: parsedOutput
  } as Omit<TaskCallResult, 'output' | 'input'> & {
    input: z.infer<typeof STRUCTURED_OUTPUT_TASK_DEF.inputType>,
    output: z.infer<O>
  };
}