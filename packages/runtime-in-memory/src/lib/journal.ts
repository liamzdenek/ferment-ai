import { RootConstruct } from 'constructs';
import {
  Journal as JournalInterface,
  WorkflowLogEvent,
  Module,
  WorkflowDefinition,
  TaskFunctionMap,
  WorkflowExecutor,
  compileWorkflow,
  WorkflowExecutionOptions,
  compileWorkflows,
  CompileWorkflowsResult
} from '@ferment-ai/runtime-common';

/**
 * Options for creating a Journal
 */
export interface JournalOptions {
  /**
   * Enable compression for saved state
   */
  enableCompression?: boolean;
}

/**
 * An in-memory implementation of the Journal interface
 */
export class Journal implements JournalInterface {
  /**
   * The log of events
   */
  private readonly log: WorkflowLogEvent[] = [];

  /**
   * The state of the journal
   */
  private readonly state: Map<string, any> = new Map();

  /**
   * The workflows registered with this journal
   */
  private readonly workflows: Map<string, WorkflowDefinition> = new Map();

  /**
   * The task functions for the workflows
   */
  private readonly taskFunctions: TaskFunctionMap = {};

  /**
   * The workflow executors
   */
  private readonly executors: Map<string, WorkflowExecutor> = new Map();

  /**
   * Creates a new Journal instance
   *
   * @param modules An ordered list of modules
   * @param options Options for the journal
   */
  constructor(
    private readonly modules: Module[],
    options: JournalOptions & { rootConstruct: RootConstruct }
  ) {
    // Compile workflows from the root construct
    const result = compileWorkflows({
      rootConstruct: options.rootConstruct,
      modules: this.modules
    });

    // Store the compiled workflows and task functions
    this.initializeFromCompileResult(result);
  }

  /**
   * Initializes the journal from a compile result
   *
   * @param result The result of compiling workflows
   */
  private initializeFromCompileResult(result: CompileWorkflowsResult): void {
    // Store the task functions
    Object.assign(this.taskFunctions, result.taskFunctions);

    // Store the workflows and executors
    for (const [name, workflow] of Object.entries(result.workflows)) {
      this.workflows.set(name, workflow);
      this.executors.set(name, result.executors[name]);
    }
  }

  /**
   * Executes a workflow
   *
   * @param workflowName The name of the workflow to execute
   * @param event The event to execute the workflow with
   * @returns An async iterable of log events
   */
  async *executeWorkflow(workflowName: string, event: any): AsyncIterable<WorkflowLogEvent> {
    // Get the workflow executor
    const executor = this.executors.get(workflowName);
    if (!executor) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // Execute the workflow
    const options: WorkflowExecutionOptions = {
      entryPoint: 'default',
      input: event
    };

    // Execute the workflow and yield all events
    for await (const event of executor(options)) {
      this.log.push(event);
      yield event;
    }
  }

  /**
   * Converts the journal state to a serializable object
   *
   * @returns A serializable object representing the journal state
   */
  toSavedState(): any {
    const state = {
      log: this.log,
      state: Object.fromEntries(this.state),
      workflows: Object.fromEntries(this.workflows),
      taskFunctions: this.taskFunctions
    };

    return state;
  }

  /**
   * Restores the journal state from a serializable object
   *
   * @param state The serializable object representing the journal state
   */
  fromSavedState(state: any): void {
    // Clear the current state
    this.log.length = 0;
    this.state.clear();
    this.workflows.clear();
    this.executors.clear();
    Object.keys(this.taskFunctions).forEach(key => delete this.taskFunctions[key]);

    // Restore the log
    if (state.log && Array.isArray(state.log)) {
      this.log.push(...state.log);
    }

    // Restore the state
    if (state.state && typeof state.state === 'object') {
      for (const [key, value] of Object.entries(state.state)) {
        this.state.set(key, value);
      }
    }

    // Restore the workflows
    if (state.workflows && typeof state.workflows === 'object') {
      for (const [name, workflow] of Object.entries(state.workflows)) {
        this.workflows.set(name, workflow as WorkflowDefinition);
      }
    }

    // Restore the task functions
    if (state.taskFunctions && typeof state.taskFunctions === 'object') {
      Object.assign(this.taskFunctions, state.taskFunctions);
    }

    // Recompile the workflows
    for (const [name, workflow] of this.workflows.entries()) {
      const executor = compileWorkflow(workflow, this.taskFunctions);
      this.executors.set(name, executor);
    }
  }
}