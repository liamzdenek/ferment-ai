import { JournalState } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages serialization and deserialization of the journal state
 */
export class SerializationManager {
  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Whether to enable compression
   */
  private enableCompression: boolean;

  /**
   * Creates a new SerializationManager
   * 
   * @param journal Reference to the journal implementation
   * @param enableCompression Whether to enable compression
   */
  constructor(journal: JournalImpl, enableCompression: boolean = false) {
    this.journal = journal;
    this.enableCompression = enableCompression;
  }

  /**
   * Serializes the journal state to a string
   * 
   * @param state The journal state to serialize
   * @returns The serialized journal state
   */
  serialize(state: JournalState): string {
    // Convert maps to arrays
    const serializedState = {
      events: state.events,
      entities: Array.from(state.entities.entries()),
      components: Array.from(state.components.entries()).map(([type, map]) => [type, Array.from(map.entries())]),
      systems: state.systems,
      processes: Array.from(state.processes.entries()),
      boundConstructs: Array.from(state.boundConstructs)
    };

    // Serialize
    const serialized = JSON.stringify(serializedState);

    // Compress if enabled
    if (this.enableCompression) {
      // Implement compression here
      // For now, just return the serialized state
      return serialized;
    }

    return serialized;
  }

  /**
   * Deserializes a string to a journal state
   * 
   * @param data The serialized journal state
   * @returns The deserialized journal state
   */
  deserialize(data: string): JournalState {
    // Decompress if needed
    let decompressed = data;

    if (this.enableCompression) {
      // Implement decompression here
      // For now, just use the data as is
      decompressed = data;
    }

    // Parse the data
    const serializedState = JSON.parse(decompressed);

    // Convert arrays to maps
    const state: JournalState = {
      events: serializedState.events,
      entities: new Map(serializedState.entities),
      components: new Map(serializedState.components.map(([type, entries]: [string, any[]]) => [type, new Map(entries)])),
      systems: serializedState.systems,
      processes: new Map(serializedState.processes),
      boundConstructs: new Set(serializedState.boundConstructs)
    };

    return state;
  }

  /**
   * Sets whether to enable compression
   * 
   * @param enable Whether to enable compression
   */
  setEnableCompression(enable: boolean): void {
    this.enableCompression = enable;
  }

  /**
   * Gets whether compression is enabled
   * 
   * @returns Whether compression is enabled
   */
  isCompressionEnabled(): boolean {
    return this.enableCompression;
  }
}