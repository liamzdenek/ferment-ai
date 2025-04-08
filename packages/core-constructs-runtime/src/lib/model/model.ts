import { Journal } from '@ferment-ai/runtime-interfaces';

/**
 * Processes a model construct
 * 
 * @param model The model construct
 * @param journal The journal
 */
export async function processModel(model: any, journal: Journal): Promise<void> {
  // Create an entity for the model
  const entityId = journal.createEntity();
  
  // Add a ModelComponent
  journal.addComponent(entityId, 'ModelComponent', {
    type: 'ModelComponent',
    modelId: model.modelId,
    parameters: model.parameters || {}
  });
}

/**
 * Processes a virtual model construct
 * 
 * @param virtualModel The virtual model construct
 * @param journal The journal
 */
export async function processVirtualModel(virtualModel: any, journal: Journal): Promise<void> {
  // Create an entity for the virtual model
  const entityId = journal.createEntity();
  
  // Add a VirtualModelComponent
  journal.addComponent(entityId, 'VirtualModelComponent', {
    type: 'VirtualModelComponent',
    name: virtualModel.name,
    entrypointId: virtualModel.entrypoint?.node.id,
    exitPointId: virtualModel.exitPoint?.node.id
  });
}