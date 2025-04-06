import { BindingClass, BindingClassFactory, Journal } from '@ferment-ai/runtime-common';
import { ModelBinding } from './model-binding.js';
import { AgentContextBinding } from './agent-context-binding.js';
import { ToolBinding } from './tool-binding.js';

/**
 * Implementation of the BindingClassFactory interface
 */
export class DefaultBindingClassFactory implements BindingClassFactory {
  /**
   * The binding classes
   */
  private readonly bindingClasses: BindingClass[];

  /**
   * Creates a new DefaultBindingClassFactory
   * 
   * @param journal The journal to use
   */
  constructor(journal: Journal) {
    this.bindingClasses = [
      new ModelBinding(journal),
      new AgentContextBinding(journal),
      new ToolBinding(journal),
    ];
  }

  /**
   * Creates a binding class for the given construct type
   * 
   * @param constructType The type of construct to create a binding class for
   * @returns The binding class, or undefined if no binding class is available for the given construct type
   */
  public createBindingClass(constructType: string): BindingClass | undefined {
    return this.bindingClasses.find(bindingClass => bindingClass.constructType === constructType);
  }

  /**
   * Gets all available binding classes
   * 
   * @returns All available binding classes
   */
  public getAllBindingClasses(): BindingClass[] {
    return [...this.bindingClasses];
  }
}