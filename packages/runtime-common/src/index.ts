// Export Module types
export { initializeJournal } from './lib/module.js';
export type {
  ModuleDependency,
  Module
} from './lib/module.js';

// Export ECS types
export type {
  Entity,
  EntityId,
  Component,
  ComponentType,
  Process,
  ProcessId,
  ProcessStatus,
  ProcessResult,
  Event,
  System,
  SystemStateContext
} from './lib/ecs.js';

// Export Journal types
export type {
  Journal,
  JournalEvent,
  EventListener,
  EventFilter,
  JournalOptions,
  JournalState,
  SystemStateComponent
} from './lib/journal.js';

export { EventType } from './lib/journal.js';
