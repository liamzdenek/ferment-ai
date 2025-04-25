/**
 * Represents an error that occurred during workflow execution
 * Tracks the call stack, inputs, and constructs involved
 */
export class WorkflowError extends Error {
  public readonly callStack: WorkflowErrorStackFrame[];
  public readonly originalError?: Error;

  constructor(message: string, options: WorkflowErrorOptions = {}) {
    super(message);
    this.name = 'WorkflowError';
    this.callStack = options.callStack || [];
    this.originalError = options.originalError;
  }

  // Add a frame to the call stack
  public addFrame(frame: WorkflowErrorStackFrame): WorkflowError {
    this.callStack.unshift(frame);
    return this;
  }

  // Serialize the error for transmission
  public toJSON(): WorkflowErrorJSON {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      callStack: this.callStack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  // Create a WorkflowError from a serialized error
  public static fromJSON(json: WorkflowErrorJSON): WorkflowError {
    let originalError: Error | undefined = undefined;

    if (json.originalError) {
      originalError = new Error(json.originalError.message);
      originalError.name = json.originalError.name;
      originalError.stack = json.originalError.stack;
    }

    const error = new WorkflowError(json.message, {
      callStack: json.callStack,
      originalError
    });

    // Restore stack trace if available
    if (json.stack) {
      error.stack = json.stack;
    }

    return error;
  }
}

export interface WorkflowErrorStackFrame {
  taskDefId: string;
  nodePath: string;
  input: any;
  construct?: {
    id: string;
    path: string;
  };
}

export interface WorkflowErrorOptions {
  callStack?: WorkflowErrorStackFrame[];
  originalError?: Error;
}

export interface WorkflowErrorJSON {
  name: string;
  message: string;
  stack?: string;
  callStack: WorkflowErrorStackFrame[];
  originalError?: {
    name: string;
    message: string;
    stack?: string;
  };
}