import { Construct } from 'constructs';
import { INVOKE_MODEL_TASK_DEF } from '../task-defs.js';
import { WorkflowTask } from '@ferment-ai/runtime-common';

interface OllamaModelProps {
    host: string;
    modelName: string;
}

export class OllamaModel extends WorkflowTask<typeof INVOKE_MODEL_TASK_DEF.inputType, typeof INVOKE_MODEL_TASK_DEF.outputType> {
    public readonly props: OllamaModelProps;

    public override readonly taskDef = INVOKE_MODEL_TASK_DEF;

    constructor(
        scope: Construct,
        id: string,
        props: OllamaModelProps
    ) {
        super(scope, id, {})
        this.props = props;
    }
}