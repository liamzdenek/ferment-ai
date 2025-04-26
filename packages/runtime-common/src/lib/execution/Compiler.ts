import { Construct } from "constructs";
import { WorkflowDefinition, WorkflowDefinitionSchema } from "../definitions/WorkflowDefinition.js";
import { WorkflowExecutionOptions, WorkflowLogEvent, TaskCallResult, generateTaskExecutionId, TaskExecutionId, TaskCallError, TaskCallParallelRequest, TaskCallRequest, TaskCallResults } from "./TaskMessaging.js";
import { TaskImpl, TaskImplMap } from "./TaskImpl.js";
import { TaskCtx } from "./TaskCtx.js";
import { TaskPool, TaskPoolYield } from "./TaskPool.js";
import { z } from "zod";

export type WorkflowExecutor = (options: WorkflowExecutionOptions) => AsyncIterable<WorkflowLogEvent>;

interface WorkflowRuntimeContext {
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct }
}

export function compileWorkflow(
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct } = {}
): WorkflowExecutor {
  // Validate the workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);

  const wctx: WorkflowRuntimeContext = {
    workflowDef,
    taskImpls,
    nodePathToConstruct
  }

  // Validate that all tasks have corresponding task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    if (!taskImpls[taskPath]) {
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }
  }

  // Return the workflow executor function
  return async function* (options: WorkflowExecutionOptions): AsyncGenerator<WorkflowLogEvent> {
    // Log workflow start
    const startEvent: WorkflowLogEvent = {
      timestamp: Date.now(),
      type: 'workflow_start',
      input: options.input
    };

    yield startEvent;

    console.log("Options", options);

    const tctx = createTaskContext(
      wctx,
      generateTaskExecutionId(),
      workflowDef.entryPoint,
      options.input
    );

    yield* runWorkflowTasks(wctx, [tctx]);

    // Log workflow start
    const endEvent: WorkflowLogEvent = {
      timestamp: Date.now(),
      type: 'workflow_complete'
    };

    yield endEvent;
  }
}

async function* runWorkflowTasks(wctx: WorkflowRuntimeContext, tctxs: TaskCtx<any, any>[]): AsyncGenerator<WorkflowLogEvent, Array<TaskCallResult | TaskCallError>, void> {
  // Collect results to return at the end
  const results: Array<TaskCallResult | TaskCallError> = [];
  
  // Create a callback function that processes yielded values
  const processYieldedValue = async function*(
    generatorId: string,
    value: TaskCallRequest | WorkflowLogEvent
  ): AsyncGenerator<WorkflowLogEvent, TaskCallResults | TaskPoolYield<WorkflowLogEvent>, void> {
    console.log("Got yielded value", value);
    // Check if the value is a TaskCallRequest or a WorkflowLogEvent
    if (isTaskCallRequest(value)) {
      // Handle TaskCallRequest
      const taskCallRequest = value;
      
      // Create task contexts for each call
      const taskContexts = taskCallRequest.calls.map((call: { nodePath: string; input: any }) => {
        return createTaskContext(
          wctx,
          generateTaskExecutionId(),
          call.nodePath,
          call.input
        );
      });
      
      console.log("Running subtasks", taskContexts.map(c => c.nodePath));
      // Run the tasks and collect the results
      const finalResult = yield* runWorkflowTasks(wctx, taskContexts);

      console.log("Got final result from subtasks", finalResult);
      
      // If no results, return an error
      return {
        type: 'results',
        taskExecutionId: taskCallRequest.taskExecutionId,
        results: finalResult
      };
    } else {
      // For WorkflowLogEvent, yield it directly
      const v: TaskPoolYield<WorkflowLogEvent> = {
        type: 'yield',
        value
      }
      return v;
    }
  };
  
  // Create a task pool with the callback
  const taskPool = new TaskPool<
    AsyncGenerator<TaskCallRequest | WorkflowLogEvent, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError | TaskPoolYield<WorkflowLogEvent>>,
    TaskCallRequest | WorkflowLogEvent,
    TaskCallResult | TaskCallError | TaskPoolYield<WorkflowLogEvent>,
    TaskCallResult | TaskCallError | TaskPoolYield<WorkflowLogEvent>,
    WorkflowLogEvent
  >(processYieldedValue);

  // Add all task generators to the pool
  for(const tctx of tctxs) {
    const taskImpl = wctx.taskImpls[tctx.nodePath];
    const generator = taskImpl.execute(tctx);
    taskPool.push(generator);
  }
  
  // Yield all events from the task pool
  for await (const event of taskPool.next()) {
    yield event;
  }
  
  // Return the collected results
  return results;
}

/**
 * Type guard to check if a value is a TaskCallRequest
 */
function isTaskCallRequest(value: any): value is TaskCallRequest {
  return value &&
         typeof value === 'object' &&
         value.type === 'call';
}

function createTaskContext<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  wctx: WorkflowRuntimeContext,
  executionId: TaskExecutionId,
  nodePath: string,
  input: any
): TaskCtx<I, O> {
  const taskDef = wctx.workflowDef.tasks[nodePath];

  const taskImpl = wctx.taskImpls[nodePath];

  // Create the task context
  const taskCtx: TaskCtx<I, O> = {
    taskExecutionId: executionId,
    taskDefId: taskImpl.def.taskDefId,
    nodePath,
    input,
    output: undefined as any,
    canCallTasks: {},
    nodePathToConstruct: wctx.nodePathToConstruct,
  };

  // Populate canCallTasks map
  for (const toolNodePath of taskDef.reachableTasks) {
    if (wctx.taskImpls[toolNodePath]) {
      taskCtx.canCallTasks[toolNodePath] = wctx.taskImpls[toolNodePath].def;
    }
  }

  return taskCtx;
}