# Workflow System Redesign

## Overview

The current workflow.ts implementation has several issues but "kinda half works." We need a brand new version from scratch that maintains API compatibility with the existing structures while providing a cleaner, more functional approach.

## Requirements

1. **API Compatibility**: Must maintain compatibility with the following structures:
   - TaskDef, TaskImpl, WorkflowDefinition, WorkflowTask, TaskCtx, compileWorkflow(), getTools()

2. **Call Patterns**: Must support both:
   - "callAndReturn": The called task becomes a subtask, and its result is returned to the caller
   - "call": The called task replaces the current task in the stack

3. **Design Principles**:
   - Purely functional programming (no classes)
   - Consistent, simple, observable task call stack
   - Clean, maintainable code
   - Robust error handling

## Current Issues

1. **Complex State Management**: The current implementation has complex nested conditionals and state management that make it difficult to understand and maintain.

2. **Task Execution Logic**: The task execution logic is scattered and hard to follow.

3. **Error Handling**: Error handling is inconsistent and scattered throughout the code.

4. **Call Stack Management**: The management of the task call stack is complex and error-prone, particularly with the two different calling patterns.

5. **Code Organization**: The code lacks clear separation of concerns and functional organization.

## Key Design Decisions

1. **Generator-Only Execution Model**: 
   - The compiler will only support generator-based task functions natively
   - Promise-based functions are already handled by converting them to generators using the `convertPromiseToGenerator` utility in util.ts
   - No need to add "first class" support for promises in the compiler

2. **Explicit Call Stack**:
   - Implement a functional call stack management system
   - Make state transitions explicit and observable
   - Simplify the logic for both "call" and "callAndReturn" patterns

3. **Immutable State**:
   - Use immutable state patterns to simplify reasoning about the code
   - Avoid side effects in core execution logic

4. **Consistent Error Handling**:
   - Centralize error handling
   - Provide clear error messages
   - Ensure errors are properly propagated

## Core Components

### 1. Task Execution Engine

The heart of the new implementation will be a pure function that executes a single task step:

```typescript
function executeTaskStep(
  taskState: TaskExecutionState,
  taskImpl: TaskImpl<z.ZodTypeAny, z.ZodTypeAny>,
  workflowDef: WorkflowDefinition
): TaskStepResult {
  // Execute a single step of the task
  // Return a result indicating the next action
}
```

This function will:
- Take the current task state, implementation, and workflow definition
- Execute a single step of the task (advancing the generator)
- Return a result indicating what should happen next (continue, call another task, return result, etc.)

### 2. Call Stack Management

The call stack will be managed by a set of pure functions:

```typescript
function pushTask(
  stack: TaskExecutionState[],
  newTask: TaskExecutionState
): TaskExecutionState[] {
  // Push a new task onto the stack
  return [...stack, newTask];
}

function popTask(
  stack: TaskExecutionState[]
): [TaskExecutionState[], TaskExecutionState | undefined] {
  // Pop a task from the stack
  if (stack.length === 0) return [stack, undefined];
  return [stack.slice(0, -1), stack[stack.length - 1]];
}

function replaceTask(
  stack: TaskExecutionState[],
  newTask: TaskExecutionState
): TaskExecutionState[] {
  // Replace the top task on the stack
  if (stack.length === 0) return [newTask];
  return [...stack.slice(0, -1), newTask];
}
```

These functions will make the call stack operations explicit and easy to understand.

### 3. Workflow Execution

The workflow execution will be handled by a function that uses the task execution engine:

```typescript
async function* executeWorkflow(
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  options: WorkflowExecutionOptions
): AsyncGenerator<WorkflowLogEvent, void, unknown> {
  // Initialize the task stack
  let taskStack: TaskExecutionState[] = [
    { nodePath: entryPointNodePath, input: options.input }
  ];
  
  // Execute tasks until the stack is empty
  while (taskStack.length > 0) {
    // Execute the current task
    const currentTask = taskStack[taskStack.length - 1];
    const result = await executeTaskStep(currentTask, taskImpls[currentTask.nodePath], workflowDef);
    
    // Handle the result
    // Update the task stack based on the result
    // Yield appropriate events
  }
}
```

This function will:
- Initialize the task stack with the entry point
- Execute tasks until the stack is empty
- Handle task results and update the stack accordingly
- Yield appropriate events during execution

### 4. Input/Output Validation

Input and output validation will be handled by a dedicated function:

```typescript
function validateWithZod<T>(
  schema: z.ZodType<T>,
  data: unknown,
  nodePath: string,
  direction: 'input' | 'output'
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid ${direction} for task ${nodePath}: ${error.message}`);
    }
    throw error;
  }
}
```

This function will:
- Validate data against a Zod schema
- Provide clear error messages for validation failures

## Implementation Plan

### 1. Core Data Structures

First, we'll define the core data structures:

```typescript
// Task execution state
interface TaskExecutionState {
  nodePath: string;
  input: any;
  generator?: AsyncGenerator<any, any, any>;
  returnTo?: {
    nodePath: string;
    generator: AsyncGenerator<any, any, any>;
  };
  calledFrom?: string; // For "call" pattern
}

// Task step result
type TaskStepResult = 
  | { type: 'continue'; state: TaskExecutionState }
  | { type: 'call'; nextTask: TaskExecutionState }
  | { type: 'callAndReturn'; nextTask: TaskExecutionState; returnTo: TaskExecutionState }
  | { type: 'return'; result: TaskCallResult | TaskCallError }
  | { type: 'complete'; result: TaskCallResult | TaskCallError };
```

### 2. Task Execution Engine

Next, we'll implement the task execution engine:

```typescript
async function executeTaskStep(
  taskState: TaskExecutionState,
  taskImpl: TaskImpl<z.ZodTypeAny, z.ZodTypeAny>,
  workflowDef: WorkflowDefinition
): Promise<TaskStepResult> {
  const { nodePath, input, generator } = taskState;
  
  try {
    // Initialize generator if needed
    if (!generator) {
      // Create task context
      const taskCtx = createTaskContext(taskState, taskImpl, workflowDef);
      
      // Initialize generator
      const newGenerator = taskImpl.execute(taskCtx);
      
      // Return updated state
      return { 
        type: 'continue', 
        state: { ...taskState, generator: newGenerator } 
      };
    }
    
    // Advance generator
    const { value, done } = await generator.next(input);
    
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
        
        // Return result
        return { 
          type: 'complete', 
          result: { ...value, output: validatedOutput } 
        };
      } else if (value && value.type === 'call') {
        // Handle "call" pattern
        return { 
          type: 'call', 
          nextTask: { 
            nodePath: value.nodePath, 
            input: value.input,
            calledFrom: nodePath 
          } 
        };
      }
      
      // Default case
      return { 
        type: 'complete', 
        result: value as TaskCallResult | TaskCallError 
      };
    }
    
    // Handle generator yield
    if (value && value.type === 'callAndReturn') {
      // Handle "callAndReturn" pattern
      return { 
        type: 'callAndReturn', 
        nextTask: { 
          nodePath: value.nodePath, 
          input: value.input 
        },
        returnTo: { 
          nodePath, 
          generator 
        } 
      };
    }
    
    // Default case (continue)
    return { 
      type: 'continue', 
      state: taskState 
    };
  } catch (error) {
    // Handle errors
    const taskError: TaskCallError = {
      type: 'error',
      taskDefId: taskImpl.def.taskDefId,
      nodePath,
      input: taskState.input,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    };
    
    return { 
      type: 'complete', 
      result: taskError 
    };
  }
}
```

### 3. Workflow Execution

Finally, we'll implement the workflow execution function:

```typescript
export function compileWorkflow(
  workflowDef: WorkflowDefinition,
  taskImpls: TaskImplMap,
  nodePathToConstruct: { [nodePath: string]: Construct } = {}
): WorkflowExecutor {
  // Validate workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);
  
  // Validate task implementations
  for (const taskPath of Object.keys(workflowDef.tasks)) {
    if (!taskImpls[taskPath]) {
      throw new Error(`Task implementation not found for task path: ${taskPath}`);
    }
  }
  
  // Return workflow executor
  return async function* (options: WorkflowExecutionOptions): AsyncIterable<WorkflowLogEvent> {
    // Validate entry point
    const entryPointNodePath = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointNodePath) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }
    
    // Start workflow
    yield {
      timestamp: Date.now(),
      type: 'workflow_start'
    };
    
    // Initialize task stack
    let taskStack: TaskExecutionState[] = [
      { nodePath: entryPointNodePath, input: options.input }
    ];
    
    // Track started and completed tasks
    const startedTasks = new Set<string>();
    const completedTasks = new Set<string>();
    
    try {
      // Execute tasks until stack is empty
      while (taskStack.length > 0) {
        const currentTask = taskStack[taskStack.length - 1];
        const { nodePath } = currentTask;
        
        // Get task implementation and definition
        const taskImpl = taskImpls[nodePath];
        const taskDef = workflowDef.tasks[nodePath];
        
        // Start task if not already started
        if (!currentTask.generator && !startedTasks.has(nodePath)) {
          // Validate input
          const validatedInput = validateWithZod(
            taskDef.inputType,
            currentTask.input,
            nodePath,
            'input'
          );
          
          // Update task input with validated input
          taskStack[taskStack.length - 1] = {
            ...currentTask,
            input: validatedInput
          };
          
          // Yield task start event
          yield {
            timestamp: Date.now(),
            type: 'task_start',
            nodePath,
            taskDefId: taskDef.taskDefId,
            input: validatedInput
          };
          
          // Mark task as started
          startedTasks.add(nodePath);
        }
        
        // Execute task step
        const result = await executeTaskStep(currentTask, taskImpl, workflowDef);
        
        // Handle result
        switch (result.type) {
          case 'continue':
            // Update task state
            taskStack[taskStack.length - 1] = result.state;
            break;
            
          case 'call':
            // Replace current task with next task
            taskStack = replaceTask(taskStack, result.nextTask);
            break;
            
          case 'callAndReturn':
            // Push next task onto stack
            taskStack = pushTask(taskStack, {
              ...result.nextTask,
              returnTo: result.returnTo
            });
            break;
            
          case 'return':
          case 'complete':
            // Yield task complete event
            if (result.result.type !== 'error') {
              yield {
                timestamp: Date.now(),
                type: 'task_complete',
                nodePath,
                taskDefId: taskDef.taskDefId,
                output: result.result.output
              };
              
              // Mark task as completed
              completedTasks.add(nodePath);
            } else {
              // Yield task error event
              yield {
                timestamp: Date.now(),
                type: 'task_error',
                nodePath,
                error: new Error(result.result.error.message)
              };
            }
            
            // Pop current task
            const [newStack] = popTask(taskStack);
            taskStack = newStack;
            
            // Handle return to caller
            if (currentTask.returnTo) {
              // Push caller back onto stack with result
              taskStack = pushTask(taskStack, {
                nodePath: currentTask.returnTo.nodePath,
                input: result.result,
                generator: currentTask.returnTo.generator
              });
            }
            // Handle call from caller
            else if (currentTask.calledFrom) {
              // Generate completion event for caller
              const callerTaskDef = workflowDef.tasks[currentTask.calledFrom];
              if (callerTaskDef) {
                yield {
                  timestamp: Date.now(),
                  type: 'task_complete',
                  nodePath: currentTask.calledFrom,
                  taskDefId: callerTaskDef.taskDefId,
                  output: result.result.type === 'result' ? result.result.output : {}
                };
                
                // Mark caller as completed
                completedTasks.add(currentTask.calledFrom);
              }
            }
            break;
        }
      }
      
      // Check for incomplete tasks
      const incompleteTasks: string[] = [];
      for (const nodePath of startedTasks) {
        if (!completedTasks.has(nodePath)) {
          incompleteTasks.push(nodePath);
        }
      }
      
      // Throw error if there are incomplete tasks
      if (incompleteTasks.length > 0) {
        throw new Error(
          `WORKFLOW BUG: The following tasks started but didn't complete: ${incompleteTasks.join(', ')}. ` +
          `This is a bug in the workflow execution engine. Check if these tasks are using 'callAndReturn' correctly.`
        );
      }
      
      // Complete workflow
      yield {
        timestamp: Date.now(),
        type: 'workflow_complete'
      };
    } catch (error) {
      // Handle workflow error
      yield {
        timestamp: Date.now(),
        type: 'workflow_error',
        error: error as Error
      };
    }
  };
}
```

## Benefits of the New Design

1. **Simplicity**: The new implementation will be easier to understand and maintain with clear, functional components.

2. **Observability**: The task call stack will be explicit and observable, making it easier to debug and reason about.

3. **Reliability**: Better error handling and validation will make the system more reliable and provide clearer error messages.

4. **Maintainability**: Clear separation of concerns and functional organization will make the code more maintainable.

5. **Performance**: More efficient execution with less overhead and clearer state management.

## Migration Strategy

Since we're maintaining API compatibility, existing code that uses the workflow system should continue to work without changes. The implementation will be completely replaced, but the interfaces will remain the same.