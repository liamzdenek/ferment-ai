import { Construct } from 'constructs';
import { TaskImpl } from './execution/TaskImpl.js';

/**
 * A module is a function that takes a construct and returns a task implementation
 * for that construct, or undefined if the module doesn't handle the construct.
 *
 * @param construct The construct to get a task implementation for
 * @returns A task implementation or undefined if the module doesn't handle the construct
 */
export type Module = (construct: Construct) => TaskImpl<any, any> | undefined;