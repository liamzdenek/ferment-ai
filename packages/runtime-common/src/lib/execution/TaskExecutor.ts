import { z } from 'zod';
import { TaskDef } from '../definitions/TaskDef.js';
import { 
  TaskCallError, 
  TaskCallParallelRequest, 
  TaskCallRequest, 
  TaskCallResult, 
  TaskExecutionId, 
  TaskStepResult,
  generateTaskExecutionId
} from './TaskMessaging.js';
import { TaskNode, TaskTree, WorkflowExecutionState } from './TaskTree.js';
import { TaskImpl, TaskImplMap, createTaskContext, validateWithZod } from './TaskExecution.js';
import { WorkflowError } from './ErrorHandling.js';

/**
 * Execute a single step of a task
 * 
 * @param executionId The execution ID of the task to execute
 * @param state The current workflow execution state
 * @param workflowDef The workflow definition
 * @param taskImpls Map of task implementations
 * @param nodePathToConstruct Map of node paths to constructs
 * @returns The updated state and the result of the task step
 */
export async function executeTaskStep(
  executionId: TaskExecutionId,
  state: WorkflowExecutionState,
  workflowDef: any, // WorkflowDefinition
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: any } // Construct
): Promise<[WorkflowExecutionState, TaskStepResult]> {
  const node = state.taskTree.getNode(executionId);
  if (!node) {
    throw new Error(`Task node with execution ID ${executionId} not found`);
  }
  
  const { nodePath, input } = node;
  const taskImpl = taskImpls[nodePath];
  
  try {
    // Initialize generator if needed
    if (node.status === 'pending') {
      // Create task context
      const taskCtx = createTaskContext(
        executionId,
        nodePath,
        input,
        taskImpl,
        workflowDef,
        taskImpls,
        nodePathToConstruct
      );
      
      // Initialize generator
      const generator = taskImpl.execute(taskCtx);
      
      // Update node status to running
      const newState = { ...state };
      newState.taskTree.updateNode(executionId, { 
        status: 'running',
        generator
      });
      
      return [newState, { type: 'continue', executionId }];
    }
    
    // Advance generator
    const generator = node.generator;
    if (!generator) {
      throw new Error(`Task node with execution ID ${executionId} has no generator`);
    }
    
    // Always wrap the input in a TaskCallResult
    const nextInput: TaskCallResult = {
      type: 'result',
      taskExecutionId: executionId,
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: node.input, // Original input to the task
      output: input // The current input is the output from a child task
    };
    
    const { value, done } = await generator.next(nextInput);
    
    // Handle generator completion
    if (done) {
      // Handle different result types
      if (value && value.type === 'result') {
        // Validate output
        const validatedOutput = validateWithZod(
          taskImpl.def.outputType,
          value.output,
          nodePath,
          'output'
        );
        
        // Update node with result
        const newState = { ...state };
        newState.taskTree.updateNode(executionId, { 
          status: 'completed',
          output: validatedOutput
        });
        newState.activeTaskIds = newState.activeTaskIds.filter(id => id !== executionId);
        newState.completedTaskIds.push(executionId);
        
        return [newState, { 
          type: 'complete', 
          result: { 
            ...value, 
            output: validatedOutput,
            taskExecutionId: executionId
          } as TaskCallResult 
        }];
      } else if (value && value.type === 'error') {
        // Update node with error
        const newState = { ...state };
        newState.taskTree.updateNode(executionId, { 
          status: 'error',
          error: value.error.details
        });
        newState.activeTaskIds = newState.activeTaskIds.filter(id => id !== executionId);
        newState.completedTaskIds.push(executionId);
        
        return [newState, { 
          type: 'complete', 
          result: { 
            ...value,
            taskExecutionId: executionId
          } as TaskCallError 
        }];
      }
      
      // Default case (should not happen with proper typing)
      throw new Error(`Unexpected result type from task ${nodePath}: ${value?.type}`);
    }
    
    // Handle generator yield
    if (value && value.type === 'call') {
      // Convert 'call' to 'callParallel' with a single item
      const callParallelValue: TaskCallParallelRequest = {
        type: 'callParallel',
        taskExecutionId: value.taskExecutionId || executionId, // Use provided ID or parent ID
        calls: [{
          taskDefId: value.taskDefId,
          nodePath: value.nodePath,
          input: value.input
        }]
      };
      
      // Process as callParallel
      return handleCallParallel(executionId, callParallelValue, state, taskImpls);
    } else if (value && value.type === 'callParallel') {
      return handleCallParallel(executionId, value, state, taskImpls);
    }
    
    // Default case (continue)
    return [state, { type: 'continue', executionId }];
  } catch (error) {
    // Create a WorkflowError if not already one
    const workflowError = error instanceof WorkflowError
      ? error
      : new WorkflowError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error instanceof Error ? error : undefined }
      );
    
    // Add current task to the call stack
    workflowError.addFrame({
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: node.input,
      construct: nodePathToConstruct[nodePath] ? {
        id: nodePathToConstruct[nodePath].node.id,
        path: nodePathToConstruct[nodePath].node.path
      } : undefined
    });
    
    // Update node with error
    const newState = { ...state };
    newState.taskTree.updateNode(executionId, { 
      status: 'error',
      error: workflowError
    });
    newState.activeTaskIds = newState.activeTaskIds.filter(id => id !== executionId);
    newState.completedTaskIds.push(executionId);
    
    // Create TaskCallError
    const taskError: TaskCallError = {
      type: 'error',
      taskExecutionId: executionId,
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: node.input,
      error: {
        message: workflowError.message,
        details: workflowError
      }
    };
    
    return [newState, { type: 'complete', result: taskError }];
  }
}

/**
 * Handle a callParallel request
 * 
 * @param parentExecutionId The execution ID of the parent task
 * @param value The callParallel request
 * @param state The current workflow execution state
 * @param taskImpls Map of task implementations
 * @returns The updated state and the result of the task step
 */
export function handleCallParallel(
  parentExecutionId: TaskExecutionId,
  value: TaskCallParallelRequest,
  state: WorkflowExecutionState,
  taskImpls: TaskImplMap
): [WorkflowExecutionState, TaskStepResult] {
  // Create new task nodes for each parallel call
  const childExecutionIds: TaskExecutionId[] = [];
  const newState = { ...state };
  
  for (const call of value.calls) {
    const childExecutionId = generateTaskExecutionId();
    childExecutionIds.push(childExecutionId);
    
    // Add the new task node
    newState.taskTree.addNode({
      executionId: childExecutionId,
      nodePath: call.nodePath,
      taskDefId: call.taskDefId,
      input: call.input,
      status: 'pending',
      parentId: parentExecutionId,
      childIds: []
    });
    
    // Add child to parent
    newState.taskTree.addChild(parentExecutionId, childExecutionId);
    
    // Add to active tasks
    newState.activeTaskIds.push(childExecutionId);
  }
  
  return [newState, { 
    type: 'callParallel', 
    childExecutionIds,
    parentExecutionId
  }];
}