# Architecture Changes for Ferment AI

## Overview

This document outlines the architectural changes needed to address several issues in the current implementation of Ferment AI. The changes focus on improving the task reference system, simplifying the architecture, and fixing workflow execution.

## 1. Update Task Function Indexing in Compiler

### Current Implementation

In `packages/runtime-common/src/lib/compiler.ts`, task functions are currently indexed by just the construct ID:

```typescript
const taskFunctions: TaskFunctionMap = {};
for (const construct of rootConstruct.node.findAll()) {
  for (const module of modules) {
    const taskFunction = module(construct);
    if (taskFunction) {
      taskFunctions[construct.node.id] = taskFunction;
      break;
    }
  }
}
```

This approach doesn't account for the fact that task names are only locally unique among siblings, not globally unique within a construct tree.

### Required Changes

1. Update the compiler to use the full path (node.path) instead of just the ID (node.id):

```typescript
const taskFunctions: TaskFunctionMap = {};
for (const construct of rootConstruct.node.findAll()) {
  for (const module of modules) {
    const taskFunction = module(construct);
    if (taskFunction) {
      taskFunctions[construct.node.path] = taskFunction;
      break;
    }
  }
}
```

2. Update any references to taskFunctions throughout the codebase to use the full path.

3. Update the workflow compilation to use the full path when looking up task functions.

## 2. Remove Entrypoint Class

### Current Implementation

The `Entrypoint` class in `packages/core-constructs-lib/src/lib/entrypoint.ts` is currently used to define the starting point for a virtual model. However, this is redundant as the first task in a Definition can serve as the entrypoint.

### Required Changes

1. Delete the `packages/core-constructs-lib/src/lib/entrypoint.ts` file.

2. Update any imports or references to `Entrypoint` in other files, particularly:
   - `packages/core-constructs-runtime/src/lib/module.ts`
   - `packages/demo/src/main.ts`
   - Any other files that import or use the Entrypoint class

3. Update the compiler to use the first task in a Definition as the entrypoint instead of looking for an Entrypoint construct.

4. Remove the `createEntrypointTaskFunction` from `packages/core-constructs-runtime/src/lib/module.ts`.

5. Update the `findEntrypoints` function in `packages/runtime-common/src/lib/compiler.ts` to handle the new approach.

## 3. Define Task Functions for Core Constructs

### Current Implementation

The `core-constructs-runtime` module currently doesn't define task functions for `AgentContext`, `OpenAIModel`, and prompt tasks.

### Required Changes

1. Add task functions for `AgentContext`, `OpenAIModel`, and prompt tasks in `packages/core-constructs-runtime/src/lib/module.ts`:

```typescript
/**
 * Creates a task function for an OpenAIModel
 *
 * @param model The OpenAI model
 * @returns A task function
 */
function createOpenAIModelTaskFunction(model: OpenAIModel): TaskFunction {
  return async (input: any) => {
    console.log(`Executing OpenAI model: ${model.node.id}`);
    console.log(`Model ID: ${model.modelId}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would call the OpenAI API
    // For now, just return a dummy response
    return {
      response: `Response from ${model.node.id}`,
      input
    };
  };
}

/**
 * Creates a task function for a prompt task
 *
 * @param task The prompt task
 * @returns A task function
 */
function createPromptTaskFunction(task: Workflow.Task): TaskFunction {
  return async (input: any) => {
    console.log(`Executing prompt task: ${task.node.id}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // In a real implementation, this would process the prompt
    // For now, just return a dummy response
    return {
      response: `Response from prompt task ${task.node.id}`,
      input
    };
  };
}
```

2. Update the `createCoreConstructsModule` function to include these new task functions:

```typescript
export function createCoreConstructsModule(): Module {
  return (construct: Construct) => {
    // Check if the construct is an AgentContext
    if (construct instanceof AgentContext) {
      return createAgentContextTaskFunction(construct);
    }
    
    // Check if the construct is an OpenAIModel
    if (construct instanceof OpenAIModel) {
      return createOpenAIModelTaskFunction(construct);
    }
    
    // Check if the construct is a Workflow.Task
    if (construct instanceof Workflow.Task) {
      // Check if it's an EndTask
      if (construct instanceof Workflow.EndTask) {
        return createWorkflowEndTaskFunction(construct);
      }
      
      return createPromptTaskFunction(construct);
    }
    
    // No task function for this construct
    return undefined;
  };
}
```

## 4. Remove Workflow-Related Task Functions

### Current Implementation

The `coreConstructsModule` currently defines task functions for workflow-related constructs, which is not needed as these are implied by the object references.

### Required Changes

1. Remove the workflow-related task functions from `packages/core-constructs-runtime/src/lib/module.ts`:
   - Remove `createWorkflowTaskFunction`
   - Keep only the task functions for `AgentContext`, `OpenAIModel`, and `Workflow.EndTask`

2. Update the `createCoreConstructsModule` function to reflect these changes.

## 5. Update Journal to Store CompileWorkflowsResult

### Current Implementation

The journal in `packages/runtime-in-memory/src/lib/journal.ts` currently decomposes the `CompileWorkflowsResult` into different fields:

```typescript
private initializeFromCompileResult(result: CompileWorkflowsResult): void {
  // Store the task functions
  Object.assign(this.taskFunctions, result.taskFunctions);

  // Store the workflows and executors
  for (const [name, workflow] of Object.entries(result.workflows)) {
    this.workflows.set(name, workflow);
    this.executors.set(name, result.executors[name]);
  }
}
```

### Required Changes

1. Update the journal to store the whole `CompileWorkflowsResult` instead of decomposing it:

```typescript
/**
 * The compile result
 */
private compileResult: CompileWorkflowsResult;

/**
 * Initializes the journal from a compile result
 *
 * @param result The result of compiling workflows
 */
private initializeFromCompileResult(result: CompileWorkflowsResult): void {
  this.compileResult = result;
}
```

2. Update any methods that use the decomposed fields to use the `compileResult` field:

```typescript
async *executeWorkflow(workflowName: string, event: any): AsyncIterable<WorkflowLogEvent> {
  // Get the workflow executor
  const executor = this.compileResult.executors[workflowName];
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
```

3. Update the serialization methods to handle the new structure:

```typescript
toSavedState(): any {
  const state = {
    log: this.log,
    state: Object.fromEntries(this.state),
    compileResult: this.compileResult
  };

  return state;
}

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
```

## 6. Fix Workflow Execution Handling

### Current Implementation

The implementation of `compileWorkflow` in `packages/runtime-common/src/lib/workflow.ts` does not properly handle the two calling patterns:
- `canCallAndReturn`: One Task invokes a sub-Task, and when the sub-Task completes, the return result is returned in a new invocation of the parent Task
- `canCall`: Replaces the current position in the stack with another task

### Required Changes

1. Update the `compileWorkflow` function to properly handle these patterns:

```typescript
export function compileWorkflow(workflowDef: WorkflowDefinition, taskFunctions: TaskFunctionMap): WorkflowExecutor {
  // Validate the workflow definition
  WorkflowDefinitionSchema.parse(workflowDef);

  // Validate that all tasks have corresponding task functions
  for (const taskId of Object.keys(workflowDef.tasks)) {
    if (!taskFunctions[taskId]) {
      throw new Error(`Task function not found for task ID: ${taskId}`);
    }
  }

  // Return the workflow executor function
  return async function* (options: WorkflowExecutionOptions): AsyncIterable<WorkflowLogEvent> {
    // Validate the entry point
    const entryPointTaskId = workflowDef.entryPoints[options.entryPoint];
    if (!entryPointTaskId) {
      throw new Error(`Entry point not found: ${options.entryPoint}`);
    }

    // Start the workflow
    yield {
      timestamp: Date.now(),
      type: 'workflow_start'
    };

    try {
      // Create a stack for task execution
      const taskStack: { taskId: string, input: any }[] = [{ taskId: entryPointTaskId, input: options.input }];
      
      // Execute tasks until the stack is empty
      while (taskStack.length > 0) {
        const { taskId, input } = taskStack.pop()!;
        const taskFunction = taskFunctions[taskId];
        const taskDef = workflowDef.tasks[taskId];
        
        // Start the task
        yield {
          timestamp: Date.now(),
          type: 'task_start',
          taskId,
          input
        };
        
        try {
          // Execute the task
          const output = await taskFunction(input);
          
          // Complete the task
          yield {
            timestamp: Date.now(),
            type: 'task_complete',
            taskId,
            output
          };
          
          // Handle next tasks (canCall)
          // This replaces the current position in the stack
          if (output.nextTaskId) {
            const nextTaskId = output.nextTaskId;
            if (workflowDef.tasks[nextTaskId]) {
              taskStack.push({ taskId: nextTaskId, input: output });
            }
          }
          
          // Handle tool calls (canCallAndReturn)
          // This adds a new task to the stack and will return to the caller
          if (output.toolCall) {
            const { toolId, toolInput } = output.toolCall;
            if (workflowDef.tasks[toolId]) {
              // Push the caller back on the stack to return to it
              taskStack.push({ taskId, input: { returnFrom: toolId, output: null } });
              // Push the tool on the stack to execute it
              taskStack.push({ taskId: toolId, input: toolInput });
            }
          }
        } catch (error) {
          // Handle task error
          yield {
            timestamp: Date.now(),
            type: 'task_error',
            taskId,
            error: error as Error
          };
        }
      }
      
      // Complete the workflow
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

## Implementation Plan

1. **Phase 1: Update Task Function Indexing**
   - Modify the compiler to use full paths
   - Update references to taskFunctions

2. **Phase 2: Remove Entrypoint Class**
   - Delete the entrypoint.ts file
   - Update imports and references
   - Update the compiler to use the first task as entrypoint

3. **Phase 3: Update Core Constructs Runtime**
   - Add task functions for AgentContext, OpenAIModel, and prompt tasks
   - Remove workflow-related task functions

4. **Phase 4: Update Journal**
   - Modify the journal to store the whole CompileWorkflowsResult
   - Update methods that use decomposed fields

5. **Phase 5: Fix Workflow Execution**
   - Update compileWorkflow to handle both calling patterns correctly

## Testing Strategy

1. **Unit Tests**
   - Test the compiler with different construct hierarchies
   - Test the journal with the new storage approach
   - Test workflow execution with both calling patterns

2. **Integration Tests**
   - Test the end-to-end workflow execution
   - Test serialization and deserialization of journal state

3. **Demo Application**
   - Update the demo application to use the new architecture
   - Test with complex workflows involving multiple agents

## Conclusion

These architectural changes will improve the robustness and flexibility of the Ferment AI system. By using full paths for task functions, removing the redundant Entrypoint class, and fixing the workflow execution, we will create a more maintainable and powerful system.