import { Component, ComponentType, EntityId } from '@ferment-ai/runtime-interfaces';
import { JournalImpl } from '../journal-impl.js';

/**
 * Manages components in the journal
 */
export class ComponentManager {
  /**
   * Map of component types to maps of entity IDs to components
   */
  private components: Map<ComponentType, Map<EntityId, Component>>;

  /**
   * Reference to the journal implementation
   */
  private journal: JournalImpl;

  /**
   * Creates a new ComponentManager
   * 
   * @param journal Reference to the journal implementation
   * @param initialComponents Initial components
   */
  constructor(
    journal: JournalImpl,
    initialComponents: Map<ComponentType, Map<EntityId, Component>> = new Map()
  ) {
    this.journal = journal;
    this.components = new Map(initialComponents);
  }

  /**
   * Adds a component to an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @param component The component
   */
  addComponent<T extends Component>(entityId: EntityId, componentType: ComponentType, component: T): void {
    // Get the component map for this type
    let componentMap = this.components.get(componentType);

    if (!componentMap) {
      componentMap = new Map();
      this.components.set(componentType, componentMap);
    }

    // Store the component
    componentMap.set(entityId, component);

    // Publish an event
    this.journal.publish(
      'component',
      'component-manager',
      {
        entityId,
        componentType,
        action: 'add',
        component
      }
    );
  }

  /**
   * Removes a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    // Get the component map for this type
    const componentMap = this.components.get(componentType);

    if (!componentMap) {
      return;
    }

    // Get the component
    const component = componentMap.get(entityId);

    if (!component) {
      return;
    }

    // Remove the component
    componentMap.delete(entityId);

    // Publish an event
    this.journal.publish(
      'component',
      'component-manager',
      {
        entityId,
        componentType,
        action: 'remove'
      }
    );
  }

  /**
   * Gets a component from an entity
   * 
   * @param entityId The ID of the entity
   * @param componentType The type of the component
   * @returns The component, or undefined if not found
   */
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    // Get the component map for this type
    const componentMap = this.components.get(componentType);

    if (!componentMap) {
      return undefined;
    }

    return componentMap.get(entityId) as T | undefined;
  }

  /**
   * Gets all entities that have a specific component
   * 
   * @param componentType The type of the component
   * @returns The IDs of entities that have the component
   */
  getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    // Get the component map for this type
    const componentMap = this.components.get(componentType);

    if (!componentMap) {
      return [];
    }

    return Array.from(componentMap.keys());
  }

  /**
   * Gets all components
   * 
   * @returns A map of component types to maps of entity IDs to components
   */
  getAllComponents(): Map<ComponentType, Map<EntityId, Component>> {
    return new Map(this.components);
  }

  /**
   * Clears all components
   */
  clear(): void {
    this.components.clear();
  }
}