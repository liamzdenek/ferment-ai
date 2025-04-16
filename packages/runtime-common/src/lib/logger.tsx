import { WorkflowLogEvent } from './workflow.js';
import React from 'react';
import { render, Box, Text, Static } from 'ink';
import chalk from 'chalk';

/**
 * Log level for workflow events
 */
export enum LogLevel {
  MINIMAL = 'minimal',
  NORMAL = 'normal',
  VERBOSE = 'verbose',
  DEBUG = 'debug'
}

/**
 * Options for the WorkflowLogger
 */
export interface WorkflowLoggerOptions {
  /**
   * The log level to use
   * @default LogLevel.NORMAL
   */
  logLevel?: LogLevel;

  /**
   * Whether to use colors in the output
   * @default true
   */
  useColors?: boolean;

  /**
   * Whether to truncate long task names
   * @default true
   */
  truncateNames?: boolean;

  /**
   * Whether to truncate large data objects
   * @default true
   */
  truncateData?: boolean;

  /**
   * The maximum depth to show in the workflow tree
   * @default 5
   */
  maxDepth?: number;
  
  /**
   * Whether to use interactive mode with live updates
   * @default true
   */
  interactive?: boolean;
}

/**
 * Log entry for display in the UI
 */
interface LogEntry {
  id: number;
  text: string;
}

/**
 * Task node for the workflow tree
 */
interface TaskNode {
  id: string;
  name: string;
  children: TaskNode[];
  status: 'running' | 'completed' | 'error';
}

/**
 * Component that displays a single task node
 */
const TaskNodeComponent: React.FC<{
  node: TaskNode;
  depth?: number;
  isLast?: boolean;
}> = ({ node, depth = 0, isLast = false }) => {
  const indent = '  '.repeat(depth);
  const prefix = isLast ? '└─' : '├─';
  
  // Determine color based on status
  let color;
  let statusIcon;
  
  switch (node.status) {
    case 'running':
      color = 'blue';
      statusIcon = '▶';
      break;
    case 'completed':
      color = 'green';
      statusIcon = '✓';
      break;
    case 'error':
      color = 'red';
      statusIcon = '✗';
      break;
    default:
      color = 'white';
      statusIcon = '◯';
  }
  
  return (
    <>
      <Box>
        <Text>{indent}{prefix} <Text color={color}>{statusIcon} {node.name}</Text></Text>
      </Box>
      
      {node.children.map((child, index) => (
        <TaskNodeComponent 
          key={child.id} 
          node={child} 
          depth={depth + 1} 
          isLast={index === node.children.length - 1} 
        />
      ))}
    </>
  );
};

/**
 * Main component for the logger UI
 */
const LoggerUI: React.FC<{
  logs: LogEntry[];
  taskTree: TaskNode[];
  workflowId: string | null;
}> = ({ logs, taskTree, workflowId }) => {
  return (
    <>
      {/* Static logs at the top */}
      <Static items={logs}>
        {(log) => (
          <Box key={log.id}>
            <Text>{log.text}</Text>
          </Box>
        )}
      </Static>
      
      {/* Workflow status at the bottom */}
      <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} marginTop={1}>
        <Box marginBottom={1}>
          <Text bold color="blue">Workflow Status{workflowId ? `: ${workflowId}` : ''}</Text>
        </Box>
        
        {taskTree.length > 0 ? (
          taskTree.map((task, index) => (
            <TaskNodeComponent 
              key={task.id} 
              node={task} 
              isLast={index === taskTree.length - 1} 
            />
          ))
        ) : (
          <Text dimColor>No active tasks</Text>
        )}
      </Box>
    </>
  );
};

/**
 * A logger for workflow events that provides a clean, hierarchical view of workflow execution
 */
export class WorkflowLogger {
  private currentTaskId: string | null = null;
  private workflowId: string | null = null;
  private taskStack: string[] = [];
  private indentLevel = 0;
  public readonly options: Required<WorkflowLoggerOptions>;
  
  // Store original console methods
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };
  
  // Task hierarchy for tree visualization
  private taskHierarchy: Map<string, string[]> = new Map();
  
  // Task status tracking
  private taskStatus: Map<string, 'running' | 'completed' | 'error'> = new Map();
  
  // Logs for display
  private logs: LogEntry[] = [];
  private logCounter = 0;
  
  // Ink app instance
  private inkInstance: ReturnType<typeof render> | null = null;
  
  // Execution timing
  private startTime = 0;
  private endTime = 0;

  /**
   * Creates a new WorkflowLogger
   * 
   * @param options Options for the logger
   */
  constructor(options: WorkflowLoggerOptions = {}) {
    this.options = {
      logLevel: options.logLevel ?? LogLevel.NORMAL,
      useColors: options.useColors ?? true,
      truncateNames: options.truncateNames ?? true,
      truncateData: options.truncateData ?? true,
      maxDepth: options.maxDepth ?? 5,
      interactive: options.interactive ?? true
    };
  }

  /**
   * Set the current task context
   * 
   * @param taskId The ID of the current task
   * @param indentLevel The indentation level for the task
   */
  setTaskContext(taskId: string | null, indentLevel = 0) {
    this.currentTaskId = taskId;
    this.indentLevel = indentLevel;
    
    if (taskId && !this.taskStack.includes(taskId)) {
      this.taskStack.push(taskId);
    } else if (!taskId && this.taskStack.length > 0) {
      this.taskStack.pop();
    }
  }

  /**
   * Set the workflow context
   * 
   * @param workflowId The ID of the current workflow
   */
  setWorkflowContext(workflowId: string | null) {
    this.workflowId = workflowId;
  }

  /**
   * Add a log entry to the logs array
   */
  private addLog(text: string) {
    this.logs.push({
      id: this.logCounter++,
      text
    });
    
    // Update UI if interactive mode is enabled
    if (this.options.interactive) {
      this.renderUI();
    }
  }

  /**
   * Get a shortened, user-friendly task name from the full task ID
   * 
   * @param taskId The full task ID
   * @returns A shortened task name
   */
  private getShortTaskName(taskId: string | null): string | null {
    if (!taskId) return null;
    
    // Extract the last part of the task path
    const parts = taskId.split('/');
    let name = parts[parts.length - 1];
    
    // Truncate if necessary
    if (this.options.truncateNames && name.length > 25) {
      name = name.substring(0, 22) + '...';
    }
    
    return name;
  }

  /**
   * Format a data object for display
   * 
   * @param data The data object to format
   * @returns A formatted string representation of the data
   */
  private formatData(data: any): string {
    if (data === undefined || data === null) {
      return String(data);
    }
    
    try {
      if (typeof data === 'object') {
        // Handle circular references
        const seen = new WeakSet();
        const stringified = JSON.stringify(data, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
            
            // For large objects, summarize
            if (this.options.truncateData) {
              if (Array.isArray(value) && value.length > 3) {
                return `Array<${value.length}>`;
              }
              
              const keys = Object.keys(value);
              if (keys.length > 3) {
                return `Object<${keys.length}>`;
              }
            }
          }
          return value;
        }, 2);
        
        // Truncate large strings
        if (this.options.truncateData && stringified.length > 100) {
          return stringified.substring(0, 97) + '...';
        }
        
        return stringified;
      }
      
      return String(data);
    } catch (error) {
      return '[Unserializable Data]';
    }
  }

  /**
   * Log a workflow event
   * 
   * @param event The workflow event to log
   */
  logWorkflowEvent(event: WorkflowLogEvent): void {
    // Start timing on workflow start
    if (event.type === 'workflow_start') {
      this.startTime = Date.now();
    }
    
    // End timing on workflow complete
    if (event.type === 'workflow_complete' || event.type === 'workflow_error') {
      this.endTime = Date.now();
    }
    
    // Update task context if needed
    if (event.type === 'task_start' && event.taskId) {
      this.setTaskContext(event.taskId, this.indentLevel + 1);
      
      // Update task hierarchy
      const parentTaskId = this.findParentTask(event.taskId);
      if (parentTaskId) {
        if (!this.taskHierarchy.has(parentTaskId)) {
          this.taskHierarchy.set(parentTaskId, []);
        }
        const children = this.taskHierarchy.get(parentTaskId);
        if (children && !children.includes(event.taskId)) {
          children.push(event.taskId);
        }
      }
      
      // Update task status
      this.taskStatus.set(event.taskId, 'running');
    } else if (event.type === 'task_complete' && event.taskId) {
      this.setTaskContext(null);
      
      // Update task status
      this.taskStatus.set(event.taskId, 'completed');
    } else if (event.type === 'task_error' && event.taskId) {
      this.setTaskContext(null);
      
      // Update task status
      this.taskStatus.set(event.taskId, 'error');
    } else if (event.type === 'workflow_start') {
      this.indentLevel = 0;
      this.taskHierarchy.clear();
      this.taskStatus.clear();
      
      // Extract workflow ID from the first task if available
      if (event.taskId) {
        const parts = event.taskId.split('/');
        if (parts.length > 0) {
          this.setWorkflowContext(parts[parts.length - 1]);
        }
      }
    }
    
    // Format the workflow event
    const formattedEvent = this.formatWorkflowEvent(event);
    
    // Add to logs
    this.addLog(formattedEvent);
    
    // If workflow is complete, show the summary
    if ((event.type === 'workflow_complete' || event.type === 'workflow_error') && this.options.interactive) {
      // Small delay to ensure the UI is updated
      setTimeout(() => {
        this.showFinalSummary();
      }, 100);
    }
  }
  
  /**
   * Find the parent task of a given task
   *
   * @param taskId The task ID to find the parent for
   * @returns The parent task ID, or null if not found
   */
  private findParentTask(taskId: string): string | null {
    const parts = taskId.split('/');
    if (parts.length <= 1) {
      return null;
    }
    
    return parts.slice(0, -1).join('/');
  }
  
  /**
   * Render the UI using Ink
   */
  private renderUI(): void {
    try {
      // Build the task tree
      const taskTree = this.buildTaskTree();
      
      // If we already have an Ink instance, update it
      if (this.inkInstance) {
        this.inkInstance.rerender(
          <LoggerUI
            logs={this.logs}
            taskTree={taskTree}
            workflowId={this.workflowId}
          />
        );
      } else {
        // Create a new Ink instance
        this.inkInstance = render(
          <LoggerUI
            logs={this.logs}
            taskTree={taskTree}
            workflowId={this.workflowId}
          />,
          {
            stdout: process.stdout,
            exitOnCtrlC: false,
            patchConsole: true
          }
        );
      }
    } catch (error) {
      // Log any errors but don't crash
      this.originalConsole.error('Error rendering workflow status:', error);
    }
  }
  
  /**
   * Show the final workflow summary
   */
  private showFinalSummary(): void {
    // Clean up the Ink instance
    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
    
    // Print a summary to the console
    const executionTime = this.endTime - this.startTime;
    console.log('\n');
    console.log(chalk.bold.blue('Workflow Execution Summary'));
    console.log(`Execution time: ${(executionTime / 1000).toFixed(2)} seconds`);
    console.log(`Total log entries: ${this.logs.length}`);
    console.log('\n');
  }
  
  /**
   * Build the task tree for rendering
   * 
   * @returns An array of root task nodes
   */
  private buildTaskTree(): TaskNode[] {
    // Find root tasks (those without parents in the hierarchy)
    const rootTaskIds = Array.from(this.taskHierarchy.keys())
      .filter(taskId => !this.findParentTask(taskId) || !this.taskHierarchy.has(this.findParentTask(taskId)!));
    
    // Build the tree starting from root tasks
    return rootTaskIds.map(taskId => this.buildTaskNode(taskId));
  }
  
  /**
   * Build a task node for the tree
   * 
   * @param taskId The task ID to build the node for
   * @returns A task node
   */
  private buildTaskNode(taskId: string): TaskNode {
    const children = this.taskHierarchy.get(taskId) || [];
    
    return {
      id: taskId,
      name: this.getShortTaskName(taskId) || taskId,
      children: children.map(childId => this.buildTaskNode(childId)),
      status: this.taskStatus.get(taskId) || 'running'
    };
  }

  /**
   * Format a workflow event for display
   * 
   * @param event The workflow event to format
   * @returns A formatted string representation of the event
   */
  private formatWorkflowEvent(event: WorkflowLogEvent): string {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    let result = '';
    
    // Extract common variables before switch to avoid lexical declaration issues
    let taskName: string | null = null;
    let indent = '';
    
    if (event.taskId) {
      taskName = this.getShortTaskName(event.taskId);
      indent = '  '.repeat(this.getTaskDepth(event.taskId));
    }
    
    switch (event.type) {
      case 'workflow_start':
        result = `[${timestamp}] ► Workflow started`;
        break;
        
      case 'workflow_complete':
        result = `[${timestamp}] ✓ Workflow completed`;
        break;
        
      case 'workflow_error':
        result = `[${timestamp}] ✗ Workflow failed: ${event.error?.message || 'Unknown error'}`;
        break;
        
      case 'task_start':
        result = `[${timestamp}] ${indent}├─ Task "${taskName}" started`;
        
        // Add input data for verbose logging
        if (this.options.logLevel === LogLevel.VERBOSE && event.input) {
          result += `\n[${timestamp}] ${indent}│  Input: ${this.formatData(event.input)}`;
        }
        break;
        
      case 'task_complete':
        result = `[${timestamp}] ${indent}└─ Task "${taskName}" completed`;
        
        // Add output data for verbose logging
        if (this.options.logLevel === LogLevel.VERBOSE && event.output) {
          result += `\n[${timestamp}] ${indent}   Output: ${this.formatData(event.output)}`;
        }
        break;
        
      case 'task_error':
        result = `[${timestamp}] ${indent}└─ Task "${taskName}" failed: ${event.error?.message || 'Unknown error'}`;
        break;
    }
    
    // Apply colors if enabled
    if (this.options.useColors) {
      if (event.type === 'workflow_start' || event.type === 'task_start') {
        result = chalk.blue(result);
      } else if (event.type === 'workflow_complete' || event.type === 'task_complete') {
        result = chalk.green(result);
      } else if (event.type === 'workflow_error' || event.type === 'task_error') {
        result = chalk.red(result);
      }
    }
    
    return result;
  }

  /**
   * Get the depth of a task in the workflow tree
   * 
   * @param taskId The task ID
   * @returns The depth of the task
   */
  private getTaskDepth(taskId: string): number {
    // Simple implementation - count the number of path separators
    return (taskId.match(/\//g) || []).length;
  }

  /**
   * Restore the original console methods
   */
  restore(): void {
    // Clean up Ink instance
    if (this.inkInstance) {
      this.inkInstance.unmount();
      this.inkInstance = null;
    }
  }
}