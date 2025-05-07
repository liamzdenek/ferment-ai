import { Construct } from "constructs";
import { WorkflowDefinition, WorkflowDefinitionSchema } from "../definitions/WorkflowDefinition.js";
import { WorkflowExecutionOptions, WorkflowLogEvent, TaskCallResult, generateTaskExecutionId, TaskExecutionId, TaskCallError, TaskCallRequest, TaskCallResults } from "./TaskMessaging.js";
import { TaskImpl, TaskImplMap } from "./TaskImpl.js";
import { TaskCtx } from "./TaskCtx.js";
import { isTaskPoolYield, executeTaskTree, TaskPoolYield } from "./TaskPool.js";
import { z } from "zod";
import { WorkflowError } from "./ErrorHandling.js";

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

    for await(const yielded of runWorkflowTasks(wctx, [tctx])) {
      if(yielded.type === "yield") {
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

async function* runWorkflowTasks(wctx: WorkflowRuntimeContext, tctxs: TaskCtx<any, any>[]): AsyncGenerator<TaskPoolYield<WorkflowLogEvent>, Array<TaskCallResult | TaskCallError>, void> {
  // Create a callback function that processes yielded values
  const processYieldedValue = async function*(
    generatorId: number,
    taskCallRequest: TaskCallRequest
  ): AsyncGenerator<TaskPoolYield<WorkflowLogEvent>, TaskCallResults, void> {
    //console.log("Got yielded value", taskCallRequest);
    
    // Create task contexts for each call
    const taskContexts = taskCallRequest.calls.map((call) => {
      return createTaskContext(
        wctx,
        generateTaskExecutionId(),
        call.nodePath,
        call.input
      );
    });
    
    //console.log("Running subtasks", taskContexts.map(c => c.nodePath));
    // Run the tasks and collect the results
    const finalResult = yield* runWorkflowTasks(wctx, taskContexts);
    //console.log("Got final result from subtasks", finalResult);
    
    
    // Return the results
    return {
      type: 'results',
      taskExecutionId: taskCallRequest.taskExecutionId,
      results: finalResult
    };
  };

  const onResultCallback = async function* (id: number, v: TaskCallResult | TaskCallError): AsyncGenerator<TaskPoolYield<WorkflowLogEvent>, TaskCallResult | TaskCallError, void> {
    if(v.type === 'result') {
      yield {
        type: "yield",
        value: getTaskCompleteEvent(tctxs[id], v)
      };
    } else if(v.type === 'error') {
      yield {
        type: "yield",
        value: getTaskErrorEvent(tctxs[id], v)
      };
    } else {
      throw new Error("Unknown how to handle result type: "+(v as unknown as any).type);
    }
    return v;
  }


  // Create generators for all tasks
  const generators: Array<AsyncGenerator<TaskCallRequest, TaskCallResult | TaskCallError, TaskCallResults>> = [];
  
  for(const [id, tctx] of tctxs.entries()) {
    const taskImpl = wctx.taskImpls[tctx.nodePath];

    yield {
      type: "yield",
      value: getTaskStartEvent(tctx)
    }
    
    const generator = taskImpl.execute(tctx);
    generators.push(generator);
  }
  
  // Execute all tasks using the executeTaskTree function
  // We need to filter the results to only return TaskPoolYield<WorkflowLogEvent> values
  const results = executeTaskTree<
    TaskCallRequest,
    TaskCallResult | TaskCallError,
    TaskCallResults,
    TaskPoolYield<WorkflowLogEvent>
  >(
    generators,
    processYieldedValue,
    onResultCallback
  );
  
  // Process the results and only yield TaskPoolYield values
  for await (const result of results) {
    if (isTaskPoolYield(result)) {
      yield result;
    }
  }
  
  // Get the final value from the results
  const finalResults = await results.next();
  if (!finalResults.done) {
    throw new Error("Invariant: expected last value to be done=true");
  }
  
  return finalResults.value;
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

  if(!taskDef) {
    throw new Error("InvariantViolation: Expected a taskDef to exist for all tasks, tried to call destNodePath="+nodePath);
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