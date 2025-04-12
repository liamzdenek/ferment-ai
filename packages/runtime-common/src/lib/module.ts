import { Construct } from 'constructs';
import { TaskFunction } from './workflow.js';

/**
 * A module is a function that takes a construct and returns a task function
 * for that construct, or undefined if the module doesn't handle the construct.
 *
 * @param construct The construct to get a task function for
 * @returns A task function or undefined if the module doesn't handle the construct
 */
export type Module = (construct: Construct) => TaskFunction | undefined;