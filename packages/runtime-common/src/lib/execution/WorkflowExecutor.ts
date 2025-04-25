import { z } from 'zod';
import { 
  TaskCallError, 
  TaskCallResult, 
  TaskExecutionId, 
  WorkflowExecutionOptions, 
  WorkflowLogEvent,
  generateTaskExecutionId
} from './TaskMessaging.js';
import { TaskNode, TaskTree, WorkflowExecutionState } from './TaskTree.js';
import { TaskImpl, TaskImplMap, validateWithZod } from './TaskExecution.js';
import { executeTaskStep } from './TaskExecutor.js';
import { WorkflowError } from './ErrorHandling.js';

/**
 * A workflow executor function
 */
export type WorkflowExecutor = (options: WorkflowExecutionOptions) => AsyncIterable<WorkflowLogEvent>;

/**
 * Execute a workflow
 * 
 * @param workflowDef The workflow definition
 * @param options The workflow execution options
 * @param taskImpls Map of task implementations
 * @param nodePathToConstruct Map of node paths to constructs
 * @returns An async generator of workflow log events
 */
export async function* executeWorkflow(
  workflowDef: any, // WorkflowDefinition
  options: WorkflowExecutionOptions,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: any } = {} // Construct
): AsyncGenerator<WorkflowLogEvent, void, undefined> {
  // Validate the entry point
  const entryPointNodePath = workflowDef.entryPoints[options.entryPoint];
  if (!entryPointNodePath) {
    throw new Error(`Entry point not found: ${options.entryPoint}`);
  }
  
  // Initialize workflow execution state
  const state: WorkflowExecutionState = {
    workflowId: workflowDef.id,
    taskTree: new TaskTree(),
    activeTaskIds: [],
    completedTaskIds: [],
    rootTaskId: undefined
  };
  
  // Create root task
  const rootTaskId = generateTaskExecutionId();
  state.rootTaskId = rootTaskId;
  
  // Add root task to task tree
  state.taskTree.addNode({
    executionId: rootTaskId,
    nodePath: entryPointNodePath,
    taskDefId: workflowDef.tasks[entryPointNodePath].taskDefId,
    input: options.input,
    status: 'pending',
    childIds: []
  });
  
  // Add root task to active tasks
  state.activeTaskIds.push(rootTaskId);
  
  // Start the workflow
  yield {
    timestamp: Date.now(),
    type: 'workflow_start'
  };
  
  try {
    // Execute tasks until all are completed
    while (state.activeTaskIds.length > 0) {
      // Get next task to execute (breadth-first)
      const executionId = state.activeTaskIds[0];
      const node = state.taskTree.getNode(executionId);
      
      if (!node) {
        throw new Error(`Task node with execution ID ${executionId} not found`);
      }
      
      // Start task if not already started
      if (node.status === 'pending') {
        // Validate input
        const taskDef = workflowDef.tasks[node.nodePath];
        const validatedInput = validateWithZod(
          taskDef.inputType,
          node.input,
          node.nodePath,
          'input'
        );
        
        // Update task input with validated input
        state.taskTree.updateNode(executionId, { 
          input: validatedInput 
        });
        
        // Yield task start event
        yield {
          timestamp: Date.now(),
          type: 'task_start',
          nodePath: node.nodePath,
          taskDefId: node.taskDefId,
          taskExecutionId: executionId,
          input: validatedInput
        };
      }
      
      // Execute task step
      const [newState, result] = await executeTaskStep(
        executionId,
        state,
        workflowDef,
        taskImpls,
        nodePathToConstruct
      );
      
      // Update state
      Object.assign(state, newState);
      
      // Handle result based on type
      switch (result.type) {
        case 'continue':
          // Continue with next task
          break;
          
        case 'callParallel':
          // Yield parallel tasks start event
          yield {
            timestamp: Date.now(),
            type: 'parallel_tasks_start',
            nodePath: node.nodePath,
            taskDefId: node.taskDefId,
            taskExecutionId: executionId,
            input: result.childExecutionIds.map(id => {
              const childNode = state.taskTree.getNode(id);
              return childNode ? { 
                nodePath: childNode.nodePath, 
                input: childNode.input,
                taskExecutionId: id
              } : undefined;
            }).filter(Boolean)
          };
          
          // Yield task start events for children
          for (const childId of result.childExecutionIds) {
            const childNode = state.taskTree.getNode(childId);
            if (childNode) {
              yield {
                timestamp: Date.now(),
                type: 'task_start',
                nodePath: childNode.nodePath,
                taskDefId: childNode.taskDefId,
                taskExecutionId: childId,
                input: childNode.input
              };
            }
          }
          break;
          
        case 'complete':
          // Handle task completion
          if (result.result.type === 'result') {
            // Yield task complete event
            yield {
              timestamp: Date.now(),
              type: 'task_complete',
              nodePath: node.nodePath,
              taskDefId: node.taskDefId,
              taskExecutionId: executionId,
              output: result.result.output
            };
            
            // Check if all children of parent are complete for parallel tasks
            if (node.parentId) {
              const parentNode = state.taskTree.getNode(node.parentId);
              if (parentNode) {
                const siblings = state.taskTree.getChildren(node.parentId);
                const allComplete = siblings.every(sibling => 
                  sibling.status === 'completed' || sibling.status === 'error'
                );
                
                if (allComplete) {
                  // Collect results from all children and properly format them as TaskCallResult objects
                  const results = siblings.map(sibling => {
                    if (sibling.status === 'completed') {
                      return {
                        type: 'result',
                        taskExecutionId: sibling.executionId,
                        taskDefId: sibling.taskDefId,
                        nodePath: sibling.nodePath,
                        input: sibling.input,
                        output: sibling.output
                      } as TaskCallResult;
                    } else {
                      return {
                        type: 'error',
                        taskExecutionId: sibling.executionId,
                        taskDefId: sibling.taskDefId,
                        nodePath: sibling.nodePath,
                        input: sibling.input,
                        error: {
                          message: sibling.error instanceof Error ? sibling.error.message : 'Unknown error',
                          details: sibling.error
                        }
                      } as TaskCallError;
                    }
                  });
                  
                  // Yield parallel tasks complete event
                  yield {
                    timestamp: Date.now(),
                    type: 'parallel_tasks_complete',
                    nodePath: parentNode.nodePath,
                    taskDefId: parentNode.taskDefId,
                    taskExecutionId: node.parentId,
                    output: results
                  };
                  
                  // Resume parent task with results
                  const parentGenerator = parentNode.generator;
                  if (parentGenerator) {
                    // Update parent input with results
                    state.taskTree.updateNode(node.parentId, {
                      input: results
                    });
                    
                    // Move the parent task to the end of the active tasks list
                    // This ensures it will be processed in the next iteration
                    state.activeTaskIds = state.activeTaskIds.filter(id => id !== node.parentId);
                    state.activeTaskIds.push(node.parentId);
                  }
                }
              }
            }
          } else {
            // Extract the error
            const errorDetails = result.result.error.details;
            const errorMessage = result.result.error.message;
            
            const error = errorDetails instanceof WorkflowError
              ? errorDetails
              : new Error(errorMessage);
            
            // Yield task error event
            yield {
              timestamp: Date.now(),
              type: 'task_error',
              nodePath: node.nodePath,
              taskDefId: node.taskDefId,
              taskExecutionId: executionId,
              error
            };
            
            // If this is the root task, throw the error
            if (executionId === state.rootTaskId) {
              throw error;
            }
          }
          break;
      }
    }
    
    // Check for incomplete tasks
    const incompleteTasks: string[] = [];
    for (const node of state.taskTree.getAllNodes()) {
      if (node.status !== 'completed' && node.status !== 'error') {
        incompleteTasks.push(`${node.nodePath} (${node.executionId})`);
      }
    }
    
    // Throw error if there are incomplete tasks
    if (incompleteTasks.length > 0) {
      throw new Error(
        `WORKFLOW BUG: The following tasks started but didn't complete: ${incompleteTasks.join(', ')}. ` +
        `This is a bug in the workflow execution engine.`
      );
    }
    
    // Complete workflow
    yield {
      timestamp: Date.now(),
      type: 'workflow_complete'
    };
  } catch (error) {
    // Handle workflow error
    console.log("=== WORKFLOW EXECUTION ERROR ===");
    
    // Create a WorkflowError if not already one
    const workflowError = error instanceof WorkflowError
      ? error
      : new WorkflowError(
        error instanceof Error ? error.message : 'Unknown workflow error',
        { originalError: error instanceof Error ? error : undefined }
      );
    
    console.error("Workflow error:", workflowError.message);
    
    console.error("Error call stack:");
    for (const [index, frame] of workflowError.callStack.entries()) {
      console.error(`  ${index}: ${frame.nodePath} (${frame.taskDefId})`);
      if (frame.construct) {
        console.error(`     Construct: ${frame.construct.id} (${frame.construct.path})`);
      }
      console.error(`     Input:`);
      console.error(`       ${JSON.stringify(frame.input, null, 2).replace(/\n/g, '\n       ')}`);
    }
    
    yield {
      timestamp: Date.now(),
      type: 'workflow_error',
      error: workflowError
    };
  }
}

/**
 * Compile a workflow definition into an executor function
 * 
 * @param workflowDef The workflow definition to compile
 * @param taskImpls A map of node paths to task implementations
 * @param nodePathToConstruct A map of node paths to constructs
 * @returns A workflow executor function
 */
export function compileWorkflow(
  workflowDef: any, // WorkflowDefinition
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: any } = {} // Construct
): WorkflowExecutor {
  // Validate that all tasks have corresponding task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    if (!taskImpls[taskPath]) {
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }
    
    // Verify that the execute function is an async generator
    if (!isAsyncGeneratorFunction(taskImpls[taskPath].execute)) {
      throw new Error(`Task implementation for ${taskPath} must be an async generator function`);
    }
  }
  
  // Return the workflow executor function
  return (options: WorkflowExecutionOptions) => executeWorkflow(
    workflowDef,
    options,
    taskImpls,
    nodePathToConstruct
  );
}

/**
 * Helper function to check if a function is an async generator function
 * 
 * @param fn The function to check
 * @returns True if the function is an async generator function, false otherwise
 */
function isAsyncGeneratorFunction(fn: any): boolean {
  return fn.toString().includes('function*') || fn.toString().includes('async function*');
}