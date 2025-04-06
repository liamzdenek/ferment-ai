import { JournalImpl } from './journal-impl.js';
import { JournalOptions, Journal } from '@ferment-ai/runtime-interfaces';

/**
 * Creates a new Journal
 *
 * @param options The journal options
 * @returns A new Journal
 */
export function createJournal(options: JournalOptions = {}): Journal {
  return new JournalImpl(options);
}