import { TaskExecutionId } from './TaskMessaging.js';
import { WorkflowError } from './ErrorHandling.js';

/**
 * Represents a node in the task execution tree
 */
export interface TaskNode {
  executionId: TaskExecutionId;
  nodePath: string;
  taskDefId: string;
  input: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: any;
  error?: WorkflowError | Error;
  parentId?: TaskExecutionId;
  childIds: TaskExecutionId[];
  generator?: AsyncGenerator<any, any, any>; // The task's generator if running
}

/**
 * The task execution tree
 * This is an internal implementation detail of the compiler
 * and should not be exposed to task implementations
 */
export class TaskTree {
  private nodes: Map<TaskExecutionId, TaskNode> = new Map();
  
  /**
   * Add a new task node to the tree
   * 
   * @param node The node to add
   */
  addNode(node: TaskNode): void {
    this.nodes.set(node.executionId, node);
  }
  
  /**
   * Update an existing task node in the tree
   * 
   * @param executionId The execution ID of the node to update
   * @param updates The updates to apply to the node
   */
  updateNode(executionId: TaskExecutionId, updates: Partial<TaskNode>): void {
    const existingNode = this.nodes.get(executionId);
    if (!existingNode) {
      throw new Error(`Task node with execution ID ${executionId} not found`);
    }
    this.nodes.set(executionId, { ...existingNode, ...updates });
  }
  
  /**
   * Add a child to a parent node
   * 
   * @param parentId The execution ID of the parent node
   * @param childId The execution ID of the child node
   */
  addChild(parentId: TaskExecutionId, childId: TaskExecutionId): void {
    const parentNode = this.nodes.get(parentId);
    if (!parentNode) {
      throw new Error(`Parent task node with execution ID ${parentId} not found`);
    }
    parentNode.childIds.push(childId);
  }
  
  /**
   * Get a node by execution ID
   * 
   * @param executionId The execution ID of the node to get
   * @returns The node, or undefined if not found
   */
  getNode(executionId: TaskExecutionId): TaskNode | undefined {
    return this.nodes.get(executionId);
  }
  
  /**
   * Get all child nodes for a parent
   * 
   * @param parentId The execution ID of the parent node
   * @returns An array of child nodes
   */
  getChildren(parentId: TaskExecutionId): TaskNode[] {
    const parent = this.nodes.get(parentId);
    if (!parent) return [];
    return parent.childIds
      .map(id => this.nodes.get(id))
      .filter((node): node is TaskNode => node !== undefined);
  }
  
  /**
   * Get all nodes in the tree
   * 
   * @returns An array of all nodes
   */
  getAllNodes(): TaskNode[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * Clone the tree (for immutability in functional operations)
   * 
   * @returns A new tree with the same nodes
   */
  clone(): TaskTree {
    const newTree = new TaskTree();
    for (const [id, node] of this.nodes.entries()) {
      newTree.nodes.set(id, { ...node });
    }
    return newTree;
  }
  
  /**
   * Get the number of nodes in the tree
   * 
   * @returns The number of nodes
   */
  size(): number {
    return this.nodes.size;
  }
  
  /**
   * Check if a node exists in the tree
   * 
   * @param executionId The execution ID of the node to check
   * @returns True if the node exists, false otherwise
   */
  hasNode(executionId: TaskExecutionId): boolean {
    return this.nodes.has(executionId);
  }
  
  /**
   * Get the root nodes of the tree (nodes with no parent)
   * 
   * @returns An array of root nodes
   */
  getRootNodes(): TaskNode[] {
    return this.getAllNodes().filter(node => !node.parentId);
  }
  
  /**
   * Get a node and all its descendants
   * 
   * @param executionId The execution ID of the root node
   * @returns An array of nodes
   */
  getSubtree(executionId: TaskExecutionId): TaskNode[] {
    const node = this.getNode(executionId);
    if (!node) return [];
    
    const result: TaskNode[] = [node];
    for (const childId of node.childIds) {
      result.push(...this.getSubtree(childId));
    }
    
    return result;
  }
}

/**
 * The complete state of a workflow execution
 */
export interface WorkflowExecutionState {
  workflowId: string;
  taskTree: TaskTree;
  activeTaskIds: TaskExecutionId[];
  completedTaskIds: TaskExecutionId[];
  rootTaskId?: TaskExecutionId;
}