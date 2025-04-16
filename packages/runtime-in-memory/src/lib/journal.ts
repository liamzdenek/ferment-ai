import { RootConstruct } from 'constructs';
import {
  Journal as JournalInterface,
  WorkflowLogEvent,
  Module,
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
   * The compile result containing workflows, task functions, and executors
   */
  private compileResult: CompileWorkflowsResult;

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
    this.compileResult = compileWorkflows({
      rootConstruct: options.rootConstruct,
      modules: this.modules
    });
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
    const executor = this.compileResult.executors[workflowName];
    if (!executor) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    // Execute the workflow
    const executionOptions: WorkflowExecutionOptions = {
      entryPoint: 'default',
      input: event,
    };

    // Execute the workflow and yield all events
    for await (const event of executor(executionOptions)) {
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
      compileResult: this.compileResult
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

    // Restore the compile result
    if (state.compileResult) {
      this.compileResult = state.compileResult;
    }
  }
}