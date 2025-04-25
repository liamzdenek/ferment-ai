import { WorkflowLogEvent } from './execution/TaskMessaging.js';

/**
 * A journal that executes workflows and maintains a log of events
 */
export interface Journal {
  /**
   * Executes a workflow
   * 
   * @param workflowName The name of the workflow to execute
   * @param event The event to execute the workflow with
   * @returns An async iterable of log events
   */
  executeWorkflow(workflowName: string, event: any): AsyncIterable<WorkflowLogEvent>;

  /**
   * Converts the journal state to a serializable object
   * 
   * @returns A serializable object representing the journal state
   */
  toSavedState(): any;

  /**
   * Restores the journal state from a serializable object
   * 
   * @param state The serializable object representing the journal state
   */
  fromSavedState(state: any): void;
}