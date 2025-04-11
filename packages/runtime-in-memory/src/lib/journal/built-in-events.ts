import { z } from 'zod';
import { createEventType } from '@ferment-ai/runtime-interfaces';
import { EventType } from '@ferment-ai/runtime-interfaces';

/**
 * System event type
 */
export const SYSTEM_EVENT = createEventType(EventType.SYSTEM, z.object({
  systemId: z.string(),
  action: z.string(),
  details: z.record(z.any()).optional()
}));

/**
 * User event type
 */
export const USER_EVENT = createEventType(EventType.USER, z.object({
  userId: z.string().optional(),
  action: z.string(),
  details: z.record(z.any()).optional()
}));

/**
 * Entity event type
 */
export const ENTITY_EVENT = createEventType(EventType.ENTITY, z.object({
  entityId: z.string(),
  action: z.string(),
  details: z.record(z.any()).optional()
}));

/**
 * Component event type
 */
export const COMPONENT_EVENT = createEventType(EventType.COMPONENT, z.object({
  entityId: z.string(),
  componentType: z.string(),
  action: z.string(),
  details: z.record(z.any()).optional()
}));

/**
 * Process event type
 */
export const PROCESS_EVENT = createEventType(EventType.PROCESS, z.object({
  processId: z.string(),
  action: z.string(),
  status: z.enum(['created', 'running', 'completed', 'failed']).optional(),
  result: z.any().optional(),
  error: z.any().optional(),
  details: z.record(z.any()).optional()
}));

/**
 * Error event type
 */
export const ERROR_EVENT = createEventType('error', z.object({
  message: z.string(),
  source: z.string().optional(),
  type: z.string().optional(),
  payload: z.any().optional(),
  error: z.any().optional(),
  details: z.record(z.any()).optional()
}));

/**
 * All built-in event types
 */
export const BUILT_IN_EVENTS = [
  SYSTEM_EVENT,
  USER_EVENT,
  ENTITY_EVENT,
  COMPONENT_EVENT,
  PROCESS_EVENT,
  ERROR_EVENT
];