import { v4 as uuidv4 } from 'uuid';
import { Entity, EntityId } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages entities in the journal
 */
export class EntityManager {
  /**
   * Map of entity IDs to entities
   */
  private entities: Map<EntityId, Entity>;

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new EntityManager
   * 
   * @param journal Reference to the journal implementation
   * @param initialEntities Initial entities
   */
  constructor(journal: JournalImpl, initialEntities: Map<EntityId, Entity> = new Map()) {
    this.journal = journal;
    this.entities = new Map(initialEntities);
  }

  /**
   * Creates a new entity
   * 
   * @returns The ID of the created entity
   */
  createEntity(): EntityId {
    // Create an entity ID
    const id = uuidv4();

    // Create the entity
    const entity: Entity = {
      id
    };

    // Store the entity
    this.entities.set(id, entity);

    // Publish an event
    this.journal.publish(
      'entity',
      'entity-manager',
      {
        entityId: id,
        action: 'create'
      }
    );

    return id;
  }

  /**
   * Removes an entity
   * 
   * @param id The ID of the entity to remove
   */
  removeEntity(id: EntityId): void {
    // Get the entity
    const entity = this.entities.get(id);

    if (!entity) {
      return;
    }

    // Remove the entity
    this.entities.delete(id);

    // Publish an event
    this.journal.publish(
      'entity',
      'entity-manager',
      {
        entityId: id,
        action: 'remove'
      }
    );
  }

  /**
   * Gets an entity
   * 
   * @param id The ID of the entity to get
   * @returns The entity, or undefined if not found
   */
  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Gets all entities
   * 
   * @returns A map of entity IDs to entities
   */
  getAllEntities(): Map<EntityId, Entity> {
    return new Map(this.entities);
  }

  /**
   * Clears all entities
   */
  clear(): void {
    this.entities.clear();
  }
}