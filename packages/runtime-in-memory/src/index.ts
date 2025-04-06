// Export journal implementation
export { createJournal } from './lib/journal-factory.js';
export { initializeJournal } from './lib/module.js';

// Re-export interfaces from runtime-interfaces
export type {
  Journal,
  JournalEvent,
  EventListener,
  EventFilter,
  JournalOptions,
  JournalState,
  Entity,
  EntityId,
  Component,
  ComponentType,
  System,
  Process,
  ProcessId,
  ProcessResult,
  Event,
  SystemStateContext,
  SystemStateComponent,
  ProcessStatus,
  Module,
  ModuleDependency
} from '@ferment-ai/runtime-interfaces';

export { EventType } from '@ferment-ai/runtime-interfaces';