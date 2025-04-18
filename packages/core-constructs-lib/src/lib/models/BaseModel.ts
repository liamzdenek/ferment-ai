import { WorkflowTask } from '@ferment-ai/runtime-common';
import { INVOKE_MODEL_TASK_DEF } from './BaseModelTaskDefs.js';

export class BaseModel extends WorkflowTask<typeof INVOKE_MODEL_TASK_DEF.inputType, typeof INVOKE_MODEL_TASK_DEF.outputType> {
    public override readonly taskDef = INVOKE_MODEL_TASK_DEF;
}