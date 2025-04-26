import { Construct } from "constructs";
import { WorkflowDefinition, WorkflowDefinitionSchema } from "../definitions/WorkflowDefinition.js";
import { WorkflowExecutionOptions, WorkflowLogEvent, TaskCallResult, generateTaskExecutionId, TaskExecutionId, TaskCallError, TaskCallParallelRequest, TaskCallRequest } from "./TaskMessaging.js";
import { TaskImpl, TaskImplMap } from "./TaskImpl.js";
import { TaskCtx } from "./TaskCtx.js";
import { create } from "domain";
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
  const taskPool = new TaskPool<AsyncGenerator<TaskCallRequest, TaskCallResult | TaskCallError, TaskCallResult | TaskCallError>>();

  for(const tctx of tctxs) {
    const taskImpl = wctx.taskImpls[tctx.nodePath];
    const generator = taskImpl.execute(tctx);
    taskPool.push(generator)
  }
  
  let step: Awaited<ReturnType<typeof taskPool.next>>;
  while((step = taskPool.next()) !== undefined ) {
    if(step.type === 'yield') {
      yield step.value;
      continue;
    }

    if(step.type === 'get_next') {
      // indicating step.value is of type TaskCallRequest
      if(step.value.type === 'call') {
        taskPool.waitForNext(step.generatorId, async function*() {
          const tctxs = step.value.calls.map(call => { // expected to be properly typed TaskCallRequest
            return createTaskContext(
              wctx,
              generateTaskExecutionId(),
              call.nodePath,
              call.input
            );
          });
          const taskRes = yield* runWorkflowTasks(wctx, tctxs);
          return taskRes;
        })
      }
    }
  }

  // return the array of TaskCallResult | TaskCallError
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