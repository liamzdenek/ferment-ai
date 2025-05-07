import { Construct } from "constructs";
import { WorkflowDefinition, WorkflowDefinitionSchema } from "../definitions/WorkflowDefinition.js";
import { WorkflowExecutionOptions, WorkflowLogEvent, TaskCallResult, generateTaskExecutionId, TaskExecutionId, TaskCallError, TaskCallResults } from "./TaskMessaging.js";
import { TaskImplMap } from "./TaskImpl.js";
import { TaskCtx } from "./TaskCtx.js";
import { z } from "zod";
import { WorkflowError } from "./ErrorHandling.js";
import { combineGenerators } from "./combineGenerators.js";

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
  //console.log("Got workflow definition: ", JSON.stringify(workflowDef, null, 2));
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

    for await (const yielded of runWorkflowTasks(wctx, [tctx])) {
      if (yielded.type === "yield") {
        yield yielded.value;
      }
    }

    // Log workflow start
    const endEvent: WorkflowLogEvent = {
      timestamp: Date.now(),
      type: 'workflow_complete'
    };

    yield endEvent;
  }
}

export interface TaskPoolYield<T> {
  type: 'yield',
  value: T
}

async function* runWorkflowTasks(wctx: WorkflowRuntimeContext, tctxs: TaskCtx<any, any>[]): AsyncGenerator<TaskPoolYield<WorkflowLogEvent>, Array<TaskCallResult | TaskCallError>, void> {

  const generators = Array.from(tctxs.entries()).map(async function* ([_id, tctx]) {
    const taskImpl = wctx.taskImpls[tctx.nodePath];

    const startEvent: TaskPoolYield<WorkflowLogEvent> = {
      type: "yield",
      value: getTaskStartEvent(tctx)
    }
    yield startEvent;

    const taskGenerator = taskImpl.execute(tctx);

    let nextIn: Parameters<typeof taskGenerator.next> = [];
    let v: Awaited<ReturnType<typeof taskGenerator.next>>;
    while ((v = await taskGenerator.next(...nextIn)).done === false) {
      if (!v.value || v.value?.type !== "call") {
        throw new Error("Unknown next value type: "+v.value?.type);
      }

      const taskExecutionId = v.value.taskExecutionId;

      const res = yield* runWorkflowTasks(wctx, v.value.calls.map(call => createTaskContext(
        wctx,
        taskExecutionId,
        call.nodePath,
        call.input
      )));

      const r: TaskCallResults = {
        type: "results",
        results: res,
        taskExecutionId
      }

      nextIn = [r];
    }

    if(v.value.type === "call") {
      throw new Error("Invariant violation: final return result from a generator cannot be a call");
    }

    console.log("Got returned result from generator", v.value);

    const endEvent: TaskPoolYield<WorkflowLogEvent> = {
      type: "yield",
      value: v.value.type === "result" ? getTaskCompleteEvent(tctx, v.value) : getTaskErrorEvent(tctx, v.value)
    }
    yield endEvent;

    return v.value;
  })

  const results = combineGenerators(generators);
  let v: Awaited<ReturnType<typeof results.next>>;
  while ((v = await results.next()).done === false) {
    if(v.value) {
      yield v.value;
    }
  }

  const rawFinalRes = v.value;

  if(!rawFinalRes || !Array.isArray(rawFinalRes)) {
    throw new Error("Failed to get a valid return result from combineGenerators, got: "+rawFinalRes);
  }

  const finalRes = rawFinalRes.map((v, i) => {
    if(v instanceof Error) {
      const wrapped: TaskCallError = {
        type: "error",
        taskDefId: tctxs[i].taskDefId,
        nodePath: tctxs[i].nodePath,
        input: "TODO-unimplemented", // this will need to come from monitoring all the calls in the generator
        error: {
          message: v.message,
          details: v
        }
      }
      return wrapped;
    }
    return v;
  })

  return finalRes;
}

function getTaskStartEvent(tctx: TaskCtx<any, any>): WorkflowLogEvent {
  return {
    type: 'task_start',
    timestamp: new Date().getTime(),
    nodePath: tctx.nodePath,
    taskDefId: tctx.taskDefId,
    taskExecutionId: tctx.taskExecutionId,
    input: tctx.input,
  }
}

function getTaskCompleteEvent(tctx: TaskCtx<any, any>, output: TaskCallResult): WorkflowLogEvent {
  return {
    type: 'task_complete',
    timestamp: new Date().getTime(),
    nodePath: tctx.nodePath,
    taskDefId: tctx.taskDefId,
    taskExecutionId: tctx.taskExecutionId,
    input: tctx.input,
    output: output.output
  }
}
function getTaskErrorEvent(tctx: TaskCtx<any, any>, error: TaskCallError): WorkflowLogEvent {
  return {
    type: 'task_complete',
    timestamp: new Date().getTime(),
    nodePath: tctx.nodePath,
    taskDefId: tctx.taskDefId,
    taskExecutionId: tctx.taskExecutionId,
    input: tctx.input,
    error: error.error.details instanceof WorkflowError ? error.error.details : (
      error.error.details instanceof Error ?
        new WorkflowError(error.error.message, { originalError: error.error.details }) :
        new WorkflowError(error.error.message)
    )
  }
}

function createTaskContext<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  wctx: WorkflowRuntimeContext,
  executionId: TaskExecutionId,
  nodePath: string,
  input: any
): TaskCtx<I, O> {
  console.log("Creating task context for", nodePath);

  //console.log("Tasks", wctx.workflowDef.tasks);
  const taskDef = wctx.workflowDef.tasks[nodePath];
  //console.log("taskDef", taskDef);

  if (!taskDef) {
    throw new Error("InvariantViolation: Expected a taskDef to exist for all tasks, tried to call destNodePath=" + nodePath);
  }

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